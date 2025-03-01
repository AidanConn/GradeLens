# GradeLens

**Team:** CALM Byte  
**Members:** Aidan Connaughton, Matthew Guaman, Cassidy Methot, Veronica Rodriguez

## Overview

GradeLens is a full-stack application designed to:
- Calculate GPAs for different class sections.
- Compare GPA statistics across individual sections and grouped courses.
- Track detailed grade distributions.
- Identify students on the "Good" list (A or A-) and "Work" list (D+, D, D-, or F).

This README outlines the steps to set up your local development environment using the files already provided in this repository.

## Prerequisites

Before getting started, ensure you have the following installed on your system:

### Backend (Python/FastAPI)
- **Python 3.12.2** (or a compatible version)  
  Verify with:
  ```powershell
  py --version
  ```
- **Pip** (comes with Python)
- A code editor (e.g., VS Code)

### Frontend (React/TypeScript/Vite)
- **Node.js** (v20 or later) and **npm**  
  Verify with:
  ```bash
  node --version
  npm --version
  ```
- A code editor (e.g., VS Code)

## Repository Setup

1. **Clone the Repository**

   Open your terminal and run:
   ```bash
   git clone https://github.com/your-username/GradeLens.git
   cd GradeLens
   ```

## Backend Setup (FastAPI)

1. **Navigate to the Backend Directory**
   ```bash
   cd backend
   ```

2. **Set Up the Virtual Environment**

   Use the Python launcher to create a virtual environment:
   ```powershell
   py -m venv venv
   ```

3. **Activate the Virtual Environment**

   - **On Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **On macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies**

   With the virtual environment activated, install the required packages:
   ```bash
   pip install -r requirements.txt
   ```
   The `requirements.txt` file includes FastAPI, Uvicorn, and python-multipart.

5. **Run the FastAPI Server**

   Start the backend server using Uvicorn:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be accessible at [http://localhost:8000](http://localhost:8000).

## Frontend Setup (React/TypeScript/Vite)

1. **Navigate to the Frontend Directory**
   ```bash
   cd ../frontend
   ```

2. **Install Node Dependencies**
   ```bash
   npm install
   ```

3. **Run the Frontend Development Server**
   ```bash
   npm run dev
   ```
   Your React application will be running at [http://localhost:3000](http://localhost:3000).

## Troubleshooting

### Python Not Found
If you encounter an error like:
```
Python was not found; run without arguments to install from the Microsoft Store...
```
- Use the `py` command (e.g., `py --version`).
- Alternatively, disable the Microsoft Store alias in **Settings > Apps > Manage App Execution Aliases**.

### Virtual Environment Activation Issues
Ensure you activate the virtual environment before installing packages or running the backend server:
```powershell
.\venv\Scripts\activate
```

### CORS Issues
If the frontend cannot communicate with the backend, verify the CORS settings in `main.py` within the backend directory. Adjust the allowed origins if necessary.