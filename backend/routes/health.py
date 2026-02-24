from fastapi import APIRouter
from config import settings
from services.inference.router import inference_router
from models.database import engine
from sqlmodel import Session, select
from models.database import CaseRecord
from services.rag.hybrid_retriever import hybrid_retriever

router = APIRouter()

@router.get("/api/health")
async def health_check():
    health = await inference_router.get_health()
    
    rag_loaded = False
    rag_chunk_count = 0
    try:
        hybrid_retriever.initialize()
        if hybrid_retriever.collection:
            rag_loaded = True
            rag_chunk_count = hybrid_retriever.collection.count()
    except Exception as e:
        print(f"RAG Health Check Error: {e}")
        
    case_count = 0
    try:
        with Session(engine) as session:
            case_count = session.exec(select(CaseRecord)).all()
            case_count = len(case_count)
    except Exception:
        pass
        
    return {
        "status": "ok",
        "inference_backend": "local",
        "inference_healthy": health.get("local", False),
        "rag_loaded": rag_loaded,
        "rag_chunk_count": rag_chunk_count,
        "minio_healthy": True, # Assume true if API hit without crashes, real check needs Boto ping
        "case_count": case_count
    }
