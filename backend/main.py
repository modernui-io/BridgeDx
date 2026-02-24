from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from models.database import create_db_and_tables

# Routes
from routes.health import router as health_router
from routes.files import router as files_router
from routes.assess import router as assess_router
from routes.transcribe import router as transcribe_router
from routes.cases import router as cases_router
from routes.debug_context import router as debug_context_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    # In a real app we might initialize MinIO buckets or preload models here
    yield
    # Shutdown
    pass

app = FastAPI(title="BridgeDx API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5174", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Includes
app.include_router(health_router)
app.include_router(files_router)
app.include_router(assess_router)
app.include_router(transcribe_router)
app.include_router(cases_router)
app.include_router(debug_context_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
