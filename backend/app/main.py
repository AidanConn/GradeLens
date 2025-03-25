from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import uuid
import json
from pathlib import Path
from datetime import datetime
from filelock import FileLock
import csv
from io import StringIO

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

UPLOAD_DIR = Path("/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_session_id(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = request.headers.get("X-Session-ID")
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            path="/",
            samesite="lax",
            max_age=604800  
        )
    session_files_dir = UPLOAD_DIR / session_id / "files"
    session_runs_dir = UPLOAD_DIR / session_id / "runs"
    session_files_dir.mkdir(parents=True, exist_ok=True)
    session_runs_dir.mkdir(parents=True, exist_ok=True)
    return session_id

def parse_csv_lines(lines: List[str]) -> List[List[str]]:
    """
    Convert a list of strings (lines) into a list of CSV rows.
    """
    csv_text = "\n".join(lines)
    reader = csv.reader(StringIO(csv_text))
    return list(reader)

def parse_sec_file(lines: List[str]) -> dict:
    """
    Parses a .sec file.
    Expected formats:
      - CSV Format: Header row with comma separation:
           course_code, semester, [credit_hours]
      - Plain Text Format: A single header field containing whitespace-separated tokens,
           e.g. "COMSC110.01F22  4.0" (course code then credit hours)
      Subsequent rows (CSV format) must contain: name, student_id, grade

    Returns a dictionary with the course info nested under "course" and the list of student records.
    """
    rows = parse_csv_lines(lines)
    if not rows:
        raise ValueError("Empty file")

    header = rows[0]
    if len(header) == 1:
        # Plain text header; split on whitespace.
        parts = header[0].split()
        if not parts:
            raise ValueError(f"Header line is empty after splitting: {header[0]}")
        course_name = parts[0]
        credit_hours = None
        if len(parts) > 1:
            try:
                credit_hours = float(parts[1])
            except ValueError as e:
                raise ValueError(f"Unable to convert credit value '{parts[1]}' to float: {e}")
        # No semester is available in this header.
        course_info = {"name": course_name, "credit_hours": credit_hours}
    else:
        # CSV header format with multiple columns.
        course_name = header[0].strip() if len(header) > 0 else "Unknown Course"
        semester = header[1].strip() if len(header) > 1 else None
        credit_hours = None
        if len(header) > 2:
            try:
                credit_hours = float(header[2].strip())
            except ValueError as e:
                raise ValueError(f"Unable to convert credit value '{header[2]}' to float: {e}")
        course_info = {"name": course_name, "credit_hours": credit_hours}
        if semester:
            course_info["semester"] = semester

    students = []
    for i, row in enumerate(rows[1:], start=2):
        if len(row) < 3:
            raise ValueError(f"Row {i} does not have enough columns: {row}")
        name = row[0].strip()
        student_id = row[1].strip()
        grade = row[2].strip()
        students.append({"name": name, "student_id": student_id, "grade": grade})

    return {"course": course_info, "students": students}


def parse_grp_file(lines: List[str]) -> dict:
    """
    Parses a .grp file.
    Expected format (plain text):
      - First non-empty line: course code (e.g., COMSC100)
      - Subsequent non-empty lines: section file names (e.g., COMSC110.01F22.sec, etc.)
    Returns a dictionary with the course and sections.
    """
    clean_lines = [line.strip() for line in lines if line.strip()]
    if not clean_lines:
        raise ValueError("Empty file")
    
    course = clean_lines[0]

    # Remove the .sec from the secton names
    for i in range(1, len(clean_lines)):
        clean_lines[i] = clean_lines[i].replace(".sec", "")

    sections = clean_lines[1:]  # all remaining lines are section file names
    return {"course": course, "sections": sections}

@router.post("/upload_sec_grp/")
async def upload_sec_grp_files(
    files: List[UploadFile] = File(...),
    session_id: str = Depends(get_session_id)
):
    """
    Uploads and processes multiple .SEC or .GRP files.
    - For .sec files, expects a header as defined in parse_sec_file.
    - For .grp files, expects plain text with the first non-empty line as the course and the rest as section filenames.
    The parsed data is stored as JSON.
    """
    allowed_extensions = {".sec", ".grp"}
    session_files_dir = UPLOAD_DIR / session_id / "files"
    results = []

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{ext}' for file '{file.filename}'. Only .SEC and .GRP files are allowed."
            )

        file_path = session_files_dir / file.filename
        content = await file.read()
        try:
            lines = content.decode("utf-8").splitlines()
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail=f"Unable to decode file '{file.filename}'.")

        if not lines:
            raise HTTPException(status_code=400, detail=f"Uploaded file '{file.filename}' is empty.")

        try:
            if ext == ".sec":
                parsed_data = parse_sec_file(lines)
            elif ext == ".grp":
                parsed_data = parse_grp_file(lines)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing file '{file.filename}': {str(e)}")

        json_path = file_path.with_suffix(".json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(parsed_data, f, indent=2)

        results.append({
            "message": "File processed successfully",
            "original_filename": file.filename,
            "stored_as": json_path.name,
            "parsed_data": parsed_data
        })

    return {"files": results}

@router.post("/upload_run/")
async def upload_run_file(
    run_file: UploadFile = File(...),
    session_id: str = Depends(get_session_id)
):
    ext = os.path.splitext(run_file.filename)[1].lower()
    if ext != ".run":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}' for run file '{run_file.filename}'."
        )
    run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    run_dir = UPLOAD_DIR / session_id / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    run_file_path = run_dir / run_file.filename
    content = await run_file.read()
    with open(run_file_path, "wb") as f:
        f.write(content)

    associated_files = parse_run_file_for_associated_files(run_file_path)
    with open(run_dir / "associated_files.json", "w") as f:
        json.dump(associated_files, f, indent=2)

    calc_results = process_run_file(run_file_path, associated_files, session_id)
    
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
    runs_dir = UPLOAD_DIR / session_id / "runs"
    if not runs_dir.exists():
        return {"runs": []}
    run_list = [d.name for d in runs_dir.iterdir() if d.is_dir()]
    return {"runs": run_list}

@router.get("/runs/{run_id}/calculations")
async def get_run_calculations(run_id: str, session_id: str = Depends(get_session_id)):
    calc_file_path = UPLOAD_DIR / session_id / "runs" / run_id / "calculations.json"
    if not calc_file_path.exists():
        raise HTTPException(status_code=404, detail=f"No calculation results for run {run_id}.")
    with open(calc_file_path, "r") as f:
        calc_results = json.load(f)
    return {"run_id": run_id, "calculations": calc_results}

def parse_run_file_for_associated_files(run_file_path: Path) -> dict:
    return {"referenced_files": ["COMSC100.GRP", "previous.sec"]}

def process_run_file(run_file_path: Path, associated_files: dict, session_id: str) -> dict:
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