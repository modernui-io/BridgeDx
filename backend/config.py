from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    # INFERENCE BACKEND
    INFERENCE_BACKEND: str = "local"  # "vertex" or "local"

    # GOOGLE VERTEX AI
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_CLOUD_REGION: str = "us-central1"
    MEDGEMMA_4B_MODEL: str = "medgemma-1.5-4b-it"
    MEDGEMMA_27B_MODEL: str = "medgemma-27b-text-it"

    # OLLAMA
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_4B_MODEL: str = "MedAIBase/MedGemma1.5:4b"
    # 27B model tag (Ollama) - stable on 24GB with reduced context
    OLLAMA_27B_MODEL: str = "hf.co/unsloth/medgemma-27b-it-GGUF:Q3_K_M"

    # MINIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "bridgedx"
    MINIO_SECRET_KEY: str = "bridgedx_secret_dev"
    MINIO_USE_SSL: bool = False
    MINIO_BUCKET_UPLOADS: str = "uploads"
    MINIO_BUCKET_REPORTS: str = "reports"
    MINIO_BUCKET_EXPORTS: str = "exports"

    # DATABASE
    DATABASE_URL: str = "sqlite:///./data/bridgedx.db"

    # RAG
    CHROMA_PATH: str = "./data/chroma"
    BM25_PATH: str = "./data/bm25/index.pkl"
    PARENT_STORE_PATH: str = "./data/parents"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"

    RAG_CHILD_CHUNK_SIZE: int = 300
    RAG_PARENT_CHUNK_SIZE: int = 900
    RAG_CHILD_OVERLAP: int = 50
    RAG_BM25_TOP_K: int = 12
    RAG_VECTOR_TOP_K: int = 12
    RAG_RERANK_TOP_K: int = 3
    RAG_HYBRID_ALPHA: float = 0.5

    # SAFETY
    CONFIDENCE_LOW_THRESHOLD: float = 0.40
    CONFIDENCE_HIGH_THRESHOLD: float = 0.70
    MAX_UPLOAD_SIZE_MB: int = 10
    PRESIGNED_URL_EXPIRY_SECONDS: int = 3600

    # APP
    FRONTEND_URL: str = "http://localhost:5174"
    LOG_LEVEL: str = "INFO"

    # MEDASR
    MEDASR_MODEL_ID: str = "google/medasr"
    MEDASR_SAMPLE_RATE: int = 16000
    WHISPER_MODEL_ID: str = "openai/whisper-small"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
