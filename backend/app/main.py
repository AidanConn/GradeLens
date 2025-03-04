from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os

app = FastAPI(title="Your API")

# Configure CORS
origins = [
    "http://localhost:3000",  # React app
    "http://localhost:8000",  # Python FastAPI app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to your FastAPI application!"}

# Define the router
router = APIRouter()

UPLOAD_DIRECTORY = "/app/uploads"

# Ensure the upload directory exists
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

@router.post("/uploadfile/")
async def upload_file(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename, "content_type": file.content_type, "location": file_location}

# New endpoint for mass upload of files with file type filtering
@router.post("/mass_upload/")
async def mass_upload(files: List[UploadFile] = File(...)):
    """
    Mass upload endpoint for files with extensions: .run, .grp, .sec, .lst.
    
    Files that do not have these extensions will be rejected.
    TODO:
    - Parse .run file: should contain a RUN NAME and a reference to a .grp file.
    - Parse .grp file: should contain a course name and references to .sec files.
    - Parse .sec file: should contain a section name, credits, and data.
    - Parse .lst file: additional list file processing if needed.
    """
    allowed_extensions = {".run", ".grp", ".sec", ".lst"}
    results = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for file '{file.filename}'")
        file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())
        # Place additional processing logic here based on file type.
        results.append({
            "filename": file.filename,
            "content_type": file.content_type,
            "location": file_location
        })
    return results

@router.get("/run_files/")
async def list_run_files():
    # List all files in the UPLOAD_DIRECTORY that end with .run
    run_files = [
        f for f in os.listdir(UPLOAD_DIRECTORY)
        if f.lower().endswith(".run")
    ]
    return {"run_files": run_files}


# Include the router with a prefix
app.include_router(router, prefix="/api")