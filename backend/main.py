from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS to allow requests from your frontend
origins = [
    "http://localhost:3000",  # Update if your frontend runs on a different origin/port
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"}
