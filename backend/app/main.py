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
    """
    Uploads and parses a .RUN file without performing calculations.
    The run file is stored and associated files are identified.
    """
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

    # Parse the run file to identify associated files
    associated_files = parse_run_file_for_associated_files(run_file_path)
    with open(run_dir / "associated_files.json", "w") as f:
        json.dump(associated_files, f, indent=2)
    
    return {
        "message": "Run file uploaded and parsed successfully",
        "run_id": run_id,
        "run_name": associated_files["run_name"],
        "associated_files": associated_files["grp_files"]
    }

@router.post("/runs/{run_id}/calculate")
async def calculate_run(
    run_id: str, 
    session_id: str = Depends(get_session_id)
):
    """
    Performs calculations on a previously uploaded run file.
    """
    run_dir = UPLOAD_DIR / session_id / "runs" / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    
    # Find the run file
    run_files = list(run_dir.glob("*.run"))
    if not run_files:
        raise HTTPException(status_code=404, detail=f"No run file found in run {run_id}.")
    
    run_file_path = run_files[0]
    
    # Load associated files
    associated_files_path = run_dir / "associated_files.json"
    if not associated_files_path.exists():
        raise HTTPException(status_code=404, detail=f"Associated files data not found for run {run_id}.")
    
    with open(associated_files_path, "r") as f:
        associated_files = json.load(f)
    
    # Process the run file and generate calculations
    calc_results = process_run_file(run_file_path, associated_files, session_id)
    
    # Save calculations
    calc_file_path = run_dir / "calculations.json"
    lock = FileLock(str(calc_file_path) + ".lock")
    with lock:
        with open(calc_file_path, "w") as f:
            json.dump(calc_results, f, indent=2)
    
    return {
        "message": "Run calculations completed",
        "run_id": run_id,
        "calculation_results": calc_results
    }


@router.get("/runs/")
async def list_runs(session_id: str = Depends(get_session_id)):
    """
    Lists all available runs for the current session.
    """
    session_runs_dir = UPLOAD_DIR / session_id / "runs"
    if not session_runs_dir.exists():
        return {"runs": []}
    
    runs = []
    for run_dir in session_runs_dir.iterdir():
        if not run_dir.is_dir():
            continue
        
        run_id = run_dir.name
        run_info = {"run_id": run_id}
        
        # Get run name and other metadata if available
        associated_files_path = run_dir / "associated_files.json"
        if associated_files_path.exists():
            with open(associated_files_path, "r") as f:
                associated_files = json.load(f)
                run_info["run_name"] = associated_files.get("run_name", "Unnamed Run")
                run_info["associated_files"] = associated_files.get("grp_files", [])
        
        # Check if calculations exist
        calc_file_path = run_dir / "calculations.json"
        run_info["calculations_exist"] = calc_file_path.exists()
        
        # Get creation time based on directory creation time
        creation_time = datetime.fromtimestamp(run_dir.stat().st_ctime)
        run_info["created_at"] = creation_time.isoformat()
        
        runs.append(run_info)
    
    # Sort runs by creation time (newest first)
    runs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"runs": runs}

@router.get("/runs/{run_id}/status")
async def get_run_status(
    run_id: str, 
    session_id: str = Depends(get_session_id)
):
    """
    Checks if calculations have been performed for a specific run.
    """
    run_dir = UPLOAD_DIR / session_id / "runs" / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    
    calc_file_path = run_dir / "calculations.json"
    calculations_exist = calc_file_path.exists()
    
    # Get associated files info
    associated_files_path = run_dir / "associated_files.json"
    associated_files = None
    if associated_files_path.exists():
        with open(associated_files_path, "r") as f:
            associated_files = json.load(f)
    
    return {
        "run_id": run_id,
        "calculations_exist": calculations_exist,
        "run_info": associated_files
    }

# Helper functions for parsing and processing files
def parse_run_file_for_associated_files(run_file_path: Path) -> dict:
    """
    Parses a .run file to extract the run name and associated .GRP files.
    
    Expected format:
    - First line: Run name (e.g., "FIRSTRUN")
    - Subsequent lines: GRP file names (e.g., "COMSC100.GRP")
    
    Returns a dictionary with the run name and associated files.
    """
    try:
        with open(run_file_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
            
        if not lines:
            raise ValueError("Empty run file")
            
        run_name = lines[0]
        grp_files = []
        
        for i in range(1, len(lines)):
            file_name = lines[i]
            # Ensure .GRP extension if not already present
            if not file_name.lower().endswith('.grp'):
                file_name = f"{file_name}.GRP"
            grp_files.append(file_name)
            
        return {
            "run_name": run_name,
            "grp_files": grp_files
        }
    except Exception as e:
        raise ValueError(f"Error parsing run file: {str(e)}")

def process_run_file(run_file_path: Path, associated_files: dict, session_id: str) -> dict:
    """
    Process a run file using the associated GRP files.
    
    Args:
        run_file_path: Path to the .run file
        associated_files: Dictionary containing run_name and grp_files
        session_id: User session ID for finding related files
        
    Returns:
        A dictionary with calculation results
    """
    run_name = associated_files.get("run_name", "Unnamed Run")
    grp_files = associated_files.get("grp_files", [])
    
    # Initialize results
    results = {
        "run_name": run_name,
        "processed_at": datetime.utcnow().isoformat(),
        "courses": []
    }
    
    session_files_dir = UPLOAD_DIR / session_id / "files"
    
    # Process each GRP file
    for grp_file in grp_files:
        grp_path = session_files_dir / grp_file
        grp_json_path = grp_path.with_suffix(".json")
        
        if not grp_json_path.exists():
            results["courses"].append({
                "group_file": grp_file,
                "error": f"Could not find processed JSON for {grp_file}"
            })
            continue
            
        # Load the GRP data
        with open(grp_json_path, "r", encoding="utf-8") as f:
            grp_data = json.load(f)
            
        course_name = grp_data.get("course", "Unknown Course")
        sections = grp_data.get("sections", [])
        
        course_results = {
            "course_name": course_name,
            "total_students": 0,
            "sections": [],
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "W": 0, "Other": 0},
            "average_gpa": 0.0
        }
        
        total_grade_points = 0.0
        grade_values = {"A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
        
        # Process each section in the GRP file
        for section in sections:
            section_file = f"{section}.json"
            section_path = session_files_dir / section_file
            
            if not section_path.exists():
                course_results["sections"].append({
                    "section_name": section,
                    "error": f"Could not find processed JSON for section {section}"
                })
                continue
                
            # Load the section data
            with open(section_path, "r", encoding="utf-8") as f:
                section_data = json.load(f)
                
            students = section_data.get("students", [])
            section_info = section_data.get("course", {})
            
            section_results = {
                "section_name": section,
                "student_count": len(students),
                "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "W": 0, "Other": 0}
            }
            
            # Process student grades
            for student in students:
                grade = student.get("grade", "").upper()
                
                # Update section grade distribution
                if grade in grade_values:
                    section_results["grade_distribution"][grade] += 1
                    course_results["grade_distribution"][grade] += 1
                    total_grade_points += grade_values[grade]
                elif grade == "W":
                    section_results["grade_distribution"]["W"] += 1
                    course_results["grade_distribution"]["W"] += 1
                else:
                    section_results["grade_distribution"]["Other"] += 1
                    course_results["grade_distribution"]["Other"] += 1
            
            course_results["total_students"] += section_results["student_count"]
            course_results["sections"].append(section_results)
        
        # Calculate GPA
        graded_students = sum(course_results["grade_distribution"][g] for g in grade_values.keys())
        if graded_students > 0:
            course_results["average_gpa"] = round(total_grade_points / graded_students, 2)
            
        results["courses"].append(course_results)
    
    # Calculate overall statistics
    total_students = sum(c["total_students"] for c in results["courses"])
    overall_grades = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "W": 0, "Other": 0}
    
    for course in results["courses"]:
        for grade, count in course["grade_distribution"].items():
            overall_grades[grade] += count
    
    # Calculate overall GPA
    graded_students = sum(overall_grades[g] for g in grade_values.keys())
    overall_gpa = 0.0
    if graded_students > 0:
        total_points = (
            overall_grades["A"] * 4.0 +
            overall_grades["B"] * 3.0 +
            overall_grades["C"] * 2.0 +
            overall_grades["D"] * 1.0
        )
        overall_gpa = round(total_points / graded_students, 2)
    
    results["summary"] = {
        "total_students": total_students,
        "grade_distribution": overall_grades,
        "overall_gpa": overall_gpa
    }
    
    return results


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