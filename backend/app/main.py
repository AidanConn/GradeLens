from fastapi import FastAPI, APIRouter, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os

app = FastAPI(title="Your API")

# Configure CORS
origins = [
    "http://localhost:3000",  # React app
    "http://localhost:8000",  # Swagger UI
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

# New endpoint for mass upload of files
@router.post("/mass_upload/")
async def mass_upload(files: List[UploadFile] = File(...)):
    """
    Mass upload endpoint for files with extensions: .run, .grp, .sec, .lst.
    
    TODO:
    - Parse .run file: should contain a RUN NAME and a reference to a .grp file.
    - Parse .grp file: should contain a course name and references to .sec files.
    - Parse .sec file: should contain a section name, credits, and data.
    - Parse .lst file: additional list file processing if needed.
    """
    results = []
    for file in files:
        file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())
        # This where the processing of the files would happen
        # if file.filename.endswith('.run'):
        #     process_run_file(file_location)
        results.append({
            "filename": file.filename,
            "content_type": file.content_type,
            "location": file_location
        })
    # Return list of all uploaded files' details
    return results

# Include the router with a prefix
app.include_router(router, prefix="/api")