# GradeLens

**Team:** CALM Byte  
**Members:** Aidan Connaughton, Matthew Guaman, Cassidy Methot, Veronica Rodriguez

## Overview

GradeLens is a full-stack application designed to:

- Calculate GPAs for different class sections.  
- Compare GPA statistics across individual sections and grouped courses.  
- Track detailed grade distributions.  
- Identify students on the “Good” list (A or A-) and “Work” list (D+, D, D-, or F).

This README outlines the steps to set up and run GradeLens, both:
1. **Locally** (using native Python/Node.js toolchains), and
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
- **Pip** (usually comes with Python)
- A code editor (VS Code, for example)

### 1.2 Repository Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/GradeLens.git
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
   The API will be accessible at:
   [http://localhost:8000](http://localhost:8000)

---

### 1.4 Frontend Setup (React/TypeScript/Vite)

1. **Open a Second Terminal** (or go back to the project’s root, then into `frontend`):
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
   By default, the React app will be accessible at:
   [http://localhost:3000](http://localhost:3000)

---

### 1.5 Local Development Troubleshooting

- **Python Not Found**  
  If you get an error like `Python was not found; run without arguments to install...`, use `py` (Windows) or `python3` (macOS/Linux).  
  Alternatively, disable the Microsoft Store alias in **Settings > Apps > Manage App Execution Aliases** (Windows).

- **Virtual Environment Activation Issues**  
  Make sure you run:
  ```powershell
  .\venv\Scripts\activate
  ```
  or
  ```bash
  source venv/bin/activate
  ```
  before installing packages or starting the backend server.

- **CORS Issues**  
  If the frontend can’t communicate with the backend, check CORS settings in your FastAPI code (e.g., `main.py`). Adjust allowed origins as needed.

---

## 2. Running via Docker and Docker Compose

If you prefer to avoid installing local Python or Node.js environments, you can run the entire stack with Docker Compose. Make sure you have:

- **Docker** installed and running  
- **Docker Compose** installed (often bundled with Docker Desktop)

### 2.1 Docker Compose Setup

1. **Clone the Repository** (if you haven’t already)
   ```bash
   git clone https://github.com/your-username/GradeLens.git
   cd GradeLens
   ```
2. **Build and Run Containers**  
   In the project root (where `docker-compose.yml` is located), run:
   ```bash
   docker-compose up --build
   ```
   - This will:
     - Build the **backend** image from `backend/Dockerfile`.
     - Build the **frontend** image from `frontend/Dockerfile`.
     - Spin up two containers:  
       1. **frontend** (listening on port 3000 externally, served by Nginx).  
       2. **backend** (listening on port 8000 externally, served by Uvicorn).
   - Logs from both containers will appear in your terminal.

3. **Access the App**  
   - **Frontend**: [http://localhost:3000](http://localhost:3000)  
   - **Backend**: [http://localhost:8000](http://localhost:8000)

### 2.2 Development vs. Production in Docker

- The provided `docker-compose.yml` sets environment variables like:
  ```yaml
  services:
    frontend:
      environment:
        - VITE_API_URL=http://localhost:8000
    backend:
      environment:
        - ENVIRONMENT=development
        - DATABASE_URL=sqlite:///./app.db
  ```
  - You can override these by using a `.env` file or by passing environment variables at runtime:
    ```bash
    ENVIRONMENT=production DATABASE_URL="postgresql://..." docker-compose up --build
    ```
- The **frontend** container uses a multi-stage Dockerfile that builds the React/Vite app, then serves static files with Nginx.
- The **backend** container installs Python dependencies, copies your FastAPI code, and runs `uvicorn`.

### 2.3 Docker Compose File Highlights

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
      - VITE_API_URL=http://localhost:8000

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=sqlite:///./app.db
```

- **Ports**:  
  - `frontend` is available on your host’s port **3000**. Inside the container, it listens on port 80 via Nginx.  
  - `backend` is available on your host’s port **8000**.

- **Volumes**:  
  - The `./frontend` directory is mounted into `/app` on the `frontend` container, with `/app/node_modules` as an anonymous volume.  
  - The `./backend` directory is mounted into `/app` on the `backend` container.

> **Note**: Mounting volumes means changes you make locally will reflect immediately in the container (useful for local development). However, if you want a purely production-grade deployment, you might remove or modify these volume settings.

### 2.4 Stopping the Containers

In the same terminal where `docker-compose up` is running, press `Ctrl + C`.  
Alternatively, in a separate terminal from the project root:

```bash
docker-compose down
```

---

## 3. Additional Tips

- **HTTPS**  
  For local development, HTTP is typically fine. For production, consider configuring TLS/HTTPS either at the Docker level (by adjusting the Nginx config) or behind a reverse proxy.

- **Environment Variables**  
  Store sensitive environment variables (API keys, DB credentials) in a local `.env` file and reference them from `docker-compose.yml`. Be sure not to commit `.env` files to source control.
