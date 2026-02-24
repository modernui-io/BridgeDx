import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import uuid
from datetime import datetime
from config import settings

class MinIOClient:
    """
    S3-compatible client using boto3 pointed at MinIO.
    
    All operations use presigned URLs for security.
    Files are never served directly through the API server —
    the frontend uploads/downloads directly to MinIO.
    """
    
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=f"{'https' if settings.MINIO_USE_SSL else 'http'}://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="us-east-1",
            config=Config(signature_version='s3v4')
        )
        self._ensure_buckets()
    
    def _ensure_buckets(self):
        """Create buckets if they don't exist."""
        for bucket in [settings.MINIO_BUCKET_UPLOADS,
                       settings.MINIO_BUCKET_REPORTS,
                       settings.MINIO_BUCKET_EXPORTS]:
            try:
                self.client.head_bucket(Bucket=bucket)
            except ClientError:
                try:
                    self.client.create_bucket(Bucket=bucket)
                except Exception as e:
                    print(f"Warning: Could not create bucket {bucket} automatically: {e}")
    
    def get_upload_presigned_url(self, file_extension: str) -> dict:
        """
        Generate a presigned PUT URL for direct browser upload.
        Returns: { upload_url, file_key, expires_in }
        """
        file_key = f"{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4()}.{file_extension}"
        url = self.client.generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.MINIO_BUCKET_UPLOADS, "Key": file_key},
            ExpiresIn=settings.PRESIGNED_URL_EXPIRY_SECONDS
        )
        return {"upload_url": url, "file_key": file_key, "expires_in": settings.PRESIGNED_URL_EXPIRY_SECONDS}
    
    def get_download_presigned_url(self, bucket: str, file_key: str) -> str:
        """Generate a short-lived presigned GET URL."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": file_key},
            ExpiresIn=settings.PRESIGNED_URL_EXPIRY_SECONDS
        )
    
    def download_to_bytes(self, file_key: str) -> bytes:
        """Download a file from the uploads bucket into memory for inference."""
        obj = self.client.get_object(Bucket=settings.MINIO_BUCKET_UPLOADS, Key=file_key)
        return obj["Body"].read()
    
    def schedule_deletion(self, file_key: str, bucket: str = None):
        """
        Mark a file for deletion (24h TTL).
        In production, use MinIO lifecycle policies.
        """
        bucket = bucket or settings.MINIO_BUCKET_UPLOADS
        try:
            self.client.delete_object(Bucket=bucket, Key=file_key)
        except ClientError:
            pass
    
    def store_case_report(self, case_id: str, report_bytes: bytes) -> str:
        """Store a generated PDF report. Returns the file_key."""
        file_key = f"reports/{case_id}.pdf"
        self.client.put_object(
            Bucket=settings.MINIO_BUCKET_REPORTS,
            Key=file_key,
            Body=report_bytes,
            ContentType="application/pdf"
        )
        return file_key

# Singleton instance
minio_client = MinIOClient()
