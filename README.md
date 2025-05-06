# GradeLens

**Course:** COMSC.330 Principles of Software Design  
**Team:** CALM Byte  
**Members:** Aidan Connaughton, Matthew Guaman, Cassidy Methot, Veronica Rodriguez

## Overview

GradeLens is a full-stack application designed to:

- Calculate GPAs for different class sections.
- Compare GPA statistics across individual sections and grouped courses.
- Track detailed grade distributions.
- Identify students on the “Good” list (A or A-) and “Work” list (D+, D, D-, or F).

This README outlines how to set up and run GradeLens either:
1. **Locally** (using native Python/Node.js toolchains), or
2. **Using Docker** (via Docker Compose).

---

## 1. Local Development Setup

### 1.1 Prerequisites

- **Python 3.12 (or compatible)**  
  Verify with:
  ```powershell
  py --version
  ```
  or
  ```bash
  python3 --version
  ```
- **Node.js** (v20 or later) and **npm**  
  Verify with:
  ```bash
  node --version
  npm --version
  ```
- **Pip** (usually installed with Python)
- A code editor (e.g., VS Code)

### 1.2 Repository Setup

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/AidanConn/GradeLens.git
   cd GradeLens
   ```

---

### 1.3 Backend Setup (FastAPI)

1. **Navigate to the Backend Directory**
   ```bash
   cd backend
   ```
2. **Set Up a Virtual Environment**

   On Windows:
   ```powershell
   py -m venv venv
   .\venv\Scripts\activate
   ```
   On macOS/Linux:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the FastAPI Server**
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be accessible at: [http://localhost:8002](http://localhost:8002)

---

### 1.4 Frontend Setup (React/TypeScript/Vite)

1. **Open a Second Terminal** (or open a new tab/terminal and navigate to the project’s root, then into `frontend`):
   ```bash
   cd frontend
   ```
2. **Install Node Dependencies**
   ```bash
   npm install
   ```
3. **Run the Frontend Development Server**
   ```bash
   npm run dev
   ```
   By default, the React app will be accessible at: [http://localhost:3000](http://localhost:3000)

---

### 1.5 Local Development Troubleshooting

- **Python Not Found:**  
  If you see an error like `Python was not found; run without arguments to install...`, try using `py` (on Windows) or `python3` (on macOS/Linux). You may also need to disable the Microsoft Store alias under **Settings > Apps > Manage App Execution Aliases** (Windows).

- **Virtual Environment Activation Issues:**  
  Ensure you activate your virtual environment before installing packages or starting the backend server:
  ```powershell
  .\venv\Scripts\activate
  ```
  or
  ```bash
  source venv/bin/activate
  ```

- **CORS Issues:**  
  If the frontend cannot communicate with the backend, review the CORS settings in your FastAPI code (e.g., in `main.py`). Adjust the allowed origins if needed.

---

## 2. Running via Docker and Docker Compose

If you prefer not to install local Python or Node.js environments, you can run the entire stack using Docker Compose. Make sure you have:

- **Docker** installed and running.
- **Docker Compose** installed (often bundled with Docker Desktop).

### 2.1 Docker Compose Setup

1. **Clone the Repository** (if not already done)
   ```bash
   git clone https://github.com/AidanConn/GradeLens.git
   cd GradeLens
   ```
2. **Build and Run Containers**  
   In the project root (where `docker-compose.yml` is located), run:
   ```bash
   docker-compose up --build
   ```
   This command will:
   - Build the **backend** image from `backend/Dockerfile`.
   - Build the **frontend** image from `frontend/Dockerfile`.
   - Spin up two containers:
     - **frontend** (exposed on port 3000, served by Nginx).
     - **backend** (exposed on port 8002, served by Uvicorn).
   Logs from both containers will appear in your terminal.

3. **Access the App:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend:** [http://localhost:8002](http://localhost:8002)

### 2.2 Docker Compose File Highlights

Below is an example `docker-compose.yml` without any database configuration:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:8002

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    volumes:
      - ./backend:/app
    environment:
      - ENVIRONMENT=development
```

- **Ports:**  
  - **Frontend:** Exposed on port **3000** (internally served on port 80 by Nginx).  
  - **Backend:** Exposed on port **8002** (served by Uvicorn).

- **Volumes:**  
  - The local `./frontend` directory is mounted to `/app` in the frontend container (with `/app/node_modules` as an anonymous volume).  
  - The local `./backend` directory is mounted to `/app` in the backend container.

> **Note:** Mounting volumes allows for live code updates during development. For a production deployment, consider removing or adjusting these volume settings.

### 2.3 Stopping the Containers

To stop the containers, press `Ctrl + C` in the terminal where `docker-compose up` is running, or run:
```bash
docker-compose down
```
from the project root in a separate terminal.

---