# GradeLens Backend

This is the backend server for the GradeLens application, built with FastAPI.

## Features

- REST API for file uploads and analysis
- Handles section, group, and run files
- Calculates GPA statistics and generates reports
- Exports results to Excel

## Requirements

- Python 3.12 or compatible
- pip (Python package manager)

## Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   - On Windows:
     ```powershell
     py -m venv venv
     .\venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at [http://localhost:8002](http://localhost:8002).

## Notes

- CORS is enabled for local frontend development.
- Uploaded files are stored in the `uploads/` directory.
- For Docker usage, see the main project README.
