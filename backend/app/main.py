from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Import and include routers
# from app.routers import items, users
# app.include_router(items.router)
# app.include_router(users.router)