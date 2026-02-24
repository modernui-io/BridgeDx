from fastapi import APIRouter
from models.schemas import UploadURLRequest
from services.storage.minio_client import minio_client
from config import settings

router = APIRouter()

@router.post("/api/files/upload-url")
async def get_upload_url(request: UploadURLRequest):
    """
    Frontend calls this FIRST to get a presigned URL.
    Then uploads directly to MinIO (bypasses API server).
    Returns file_key for use in assessment request.
    """
    return minio_client.get_upload_presigned_url(request.file_extension)

@router.get("/api/files/download-url/{file_key:path}")
async def get_download_url(file_key: str):
    """Returns a short-lived presigned download URL for a case report."""
    url = minio_client.get_download_presigned_url(settings.MINIO_BUCKET_REPORTS, file_key)
    return {"download_url": url}

@router.delete("/api/files/{file_key:path}")
async def delete_file(file_key: str):
    """
    Explicitly delete an uploaded file.
    Called by the assess endpoint after inference completes.
    """
    minio_client.schedule_deletion(file_key)
    return {"status": "Scheduled for deletion"}
