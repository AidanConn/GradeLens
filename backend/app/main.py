from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import uuid
import json
from pathlib import Path
from datetime import datetime
from filelock import FileLock

app = FastAPI(title="GradeLens API")

# Configure CORS
origins = [
    "http://localhost:3000",  # React app
    "http://localhost:5173",  # Dev - With out docker
    "http://localhost:8000",  # FastAPI app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root(request: Request, response: Response):
    session_id = get_session_id(request, response)
    return {"message": "Welcome to your FastAPI application!", "session_id": session_id}

router = APIRouter()

# Base upload directory using pathlib.Path
# Directory structure: /app/uploads/<session_id>/{files, runs}
UPLOAD_DIR = Path("/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_session_id(request: Request, response: Response):
    # First try to read the cookie
    session_id = request.cookies.get("session_id")
    # If the cookie is missing, check for the custom header from the frontend
    if not session_id:
        session_id = request.headers.get("X-Session-ID")
    # If still not present, generate a new one and set cookie
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True, # restrict cookie access to HTTP requests
            path="/",
            samesite="lax",  # or "None" with secure=True in production
            max_age=604800  # persists the cookie for 7 days
        )
    # Ensure the session directories always exist, regardless of the session source.
    session_files_dir = UPLOAD_DIR / session_id / "files"
    session_runs_dir = UPLOAD_DIR / session_id / "runs"
    session_files_dir.mkdir(parents=True, exist_ok=True) # create parent directories if missing
    session_runs_dir.mkdir(parents=True, exist_ok=True) # create parent directories if missing
    return session_id

@router.post("/upload_files/")
async def upload_common_files(
    files: List[UploadFile] = File(...),
    session_id: str = Depends(get_session_id)
):
    """
    Upload endpoint for common files (.sec, .grp, .lst).
    Files are stored under the session's 'files' subfolder.
    These files can later be referenced by any run.
    """
    allowed_extensions = {".sec", ".grp", ".lst"}
    session_files_dir = UPLOAD_DIR / session_id / "files"
    uploaded_files = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{ext}' for file '{file.filename}'."
            )
        file_path = session_files_dir / file.filename
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        uploaded_files.append(file.filename)
    return {"uploaded_files": uploaded_files}

@router.post("/upload_run/")
async def upload_run_file(
    run_file: UploadFile = File(...),
    session_id: str = Depends(get_session_id)
):
    """
    Upload endpoint for a .run file.
    When a .run file is uploaded:
      - A new run folder is created under the session's 'runs' subfolder (using a unique run_id).
      - The .run file is saved in that folder.
      - The run file is parsed for any associated common file references,
        and those references are stored in associated_files.json.
      - The run file is processed (e.g., GPA calculations) and the results are saved in calculations.json.
    Previous runs remain intact.
    """
    ext = os.path.splitext(run_file.filename)[1].lower()
    if ext != ".run":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}' for run file '{run_file.filename}'."
        )
    # Generate a unique run_id using timestamp; alternatively, you could use UUID
    run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    run_dir = UPLOAD_DIR / session_id / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Save the uploaded .run file to the new run folder
    run_file_path = run_dir / run_file.filename
    content = await run_file.read()
    with open(run_file_path, "wb") as f:
        f.write(content)

    # Parse the .run file to find any referenced common files (.sec, .grp, etc.)
    associated_files = parse_run_file_for_associated_files(run_file_path)
    with open(run_dir / "associated_files.json", "w") as f:
        json.dump(associated_files, f, indent=2)

    # Process the run file to perform GPA calculations or other business logic.
    calc_results = process_run_file(run_file_path, associated_files, session_id)
    
    # Write calculation results to calculations.json using file locking to prevent concurrency issues.
    calc_file_path = run_dir / "calculations.json"
    lock = FileLock(str(calc_file_path) + ".lock")
    with lock:
        with open(calc_file_path, "w") as f:
            json.dump(calc_results, f, indent=2)
    
    return {
        "message": "Run uploaded and processed",
        "run_id": run_id,
        "calculation_results": calc_results
    }

@router.get("/runs/")
async def list_runs(session_id: str = Depends(get_session_id)):
    """
    Lists all run IDs for the current session.
    """
    runs_dir = UPLOAD_DIR / session_id / "runs"
    if not runs_dir.exists():
        return {"runs": []}
    run_list = [d.name for d in runs_dir.iterdir() if d.is_dir()]
    return {"runs": run_list}

@router.get("/runs/{run_id}/calculations")
async def get_run_calculations(run_id: str, session_id: str = Depends(get_session_id)):
    """
    Retrieves the calculation results for a specific run.
    """
    calc_file_path = UPLOAD_DIR / session_id / "runs" / run_id / "calculations.json"
    if not calc_file_path.exists():
        raise HTTPException(status_code=404, detail=f"No calculation results for run {run_id}.")
    with open(calc_file_path, "r") as f:
        calc_results = json.load(f)
    return {"run_id": run_id, "calculations": calc_results}

# Dummy helper functions for demonstration purposes.
def parse_run_file_for_associated_files(run_file_path: Path) -> dict:
    """
    Dummy parser for a .run file.
    In a real implementation, this function would inspect the file contents
    to capture any references to common files (such as .sec or .grp files).
    """
    # For example, you might extract filenames mentioned in the .run file.
    return {"referenced_files": ["COMSC100.GRP", "previous.sec"]}

def process_run_file(run_file_path: Path, associated_files: dict, session_id: str) -> dict:
    """
    Dummy processor for a .run file.
    Replace this with actual GPA calculations or any other business logic.
    This function may also use referenced common files stored under the
    session's /files directory to process the run.
    """
    return {"gpa": 3.85, "grade_distribution": {"A": 12, "B": 8, "C": 3}}

# Old endpoints (commented out) for direct file uploads or mass upload processing
# are preserved below; the updated architecture prefers using /upload_files/ and /upload_run/
# for a clearer separation of concerns.
#
# @router.post("/uploadfile/")
# async def upload_file(file: UploadFile = File(...)):
#     file_location = os.path.join(str(UPLOAD_DIR), file.filename)
#     with open(file_location, "wb") as f:
#         f.write(await file.read())
#     return {"filename": file.filename, "content_type": file.content_type, "location": file_location}
#
# @router.post("/mass_upload/")
# async def mass_upload(files: List[UploadFile] = File(...)):
#     allowed_extensions = {".run", ".grp", ".sec", ".lst"}
#     results = []
#     for file in files:
#         ext = os.path.splitext(file.filename)[1].lower()
#         if ext not in allowed_extensions:
#             raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for file '{file.filename}'")
#         file_location = os.path.join(str(UPLOAD_DIR), file.filename)
#         with open(file_location, "wb") as f:
#             f.write(await file.read())
#         results.append({
#             "filename": file.filename,
#             "content_type": file.content_type,
#             "location": file_location
#         })
#     return results
#
# @router.get("/run_files/")
# async def list_run_files():
#     run_files = [f for f in os.listdir(str(UPLOAD_DIR)) if f.lower().endswith(".run")]
#     return {"run_files": run_files}
#
# @router.get("/select_run/")
# async def select_run(filename: str):
#     return {"message": f'Run file "{filename}" acknowledged.'}

app.include_router(router, prefix="/api")