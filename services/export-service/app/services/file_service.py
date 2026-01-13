"""File storage service for exports."""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class FileService:
    """Service for managing export files."""

    def __init__(self):
        self.s3_client = None
        self.use_s3 = bool(settings.AWS_ACCESS_KEY_ID)

    async def initialize(self) -> None:
        """Initialize storage client."""
        if self.use_s3:
            try:
                import boto3

                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION,
                )
                logger.info("S3 client initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize S3, using local storage: {e}")
                self.use_s3 = False

        if not self.use_s3:
            os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)

    def generate_file_path(
        self,
        workspace_id: str,
        export_type: str,
        export_format: str,
    ) -> str:
        """Generate a unique file path for the export."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_id = str(uuid.uuid4())[:8]
        filename = f"{export_type}_{timestamp}_{file_id}.{export_format}"

        if self.use_s3:
            return f"{settings.S3_PREFIX}{workspace_id}/{filename}"
        else:
            workspace_dir = os.path.join(settings.LOCAL_STORAGE_PATH, workspace_id)
            os.makedirs(workspace_dir, exist_ok=True)
            return os.path.join(workspace_dir, filename)

    async def save_file(self, file_path: str, content: bytes) -> int:
        """Save file content and return file size."""
        if self.use_s3 and self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=settings.S3_BUCKET,
                    Key=file_path,
                    Body=content,
                )
                return len(content)
            except Exception as e:
                logger.error(f"Failed to upload to S3: {e}")
                raise
        else:
            with open(file_path, "wb") as f:
                f.write(content)
            return len(content)

    async def get_download_url(
        self,
        file_path: str,
        expiry_seconds: int = 3600,
    ) -> str:
        """Get a download URL for the file."""
        if self.use_s3 and self.s3_client:
            try:
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": settings.S3_BUCKET, "Key": file_path},
                    ExpiresIn=expiry_seconds,
                )
                return url
            except Exception as e:
                logger.error(f"Failed to generate presigned URL: {e}")
                raise
        else:
            # For local storage, return a file:// URL
            return f"file://{file_path}"

    async def delete_file(self, file_path: str) -> bool:
        """Delete a file."""
        try:
            if self.use_s3 and self.s3_client:
                self.s3_client.delete_object(
                    Bucket=settings.S3_BUCKET,
                    Key=file_path,
                )
            else:
                if os.path.exists(file_path):
                    os.remove(file_path)
            return True
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False

    async def cleanup_expired_files(
        self,
        workspace_id: str,
        older_than: datetime,
    ) -> int:
        """Clean up expired export files."""
        deleted_count = 0

        if self.use_s3 and self.s3_client:
            try:
                prefix = f"{settings.S3_PREFIX}{workspace_id}/"
                response = self.s3_client.list_objects_v2(
                    Bucket=settings.S3_BUCKET,
                    Prefix=prefix,
                )

                for obj in response.get("Contents", []):
                    if obj["LastModified"].replace(tzinfo=None) < older_than:
                        self.s3_client.delete_object(
                            Bucket=settings.S3_BUCKET,
                            Key=obj["Key"],
                        )
                        deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to cleanup S3 files: {e}")
        else:
            workspace_dir = os.path.join(settings.LOCAL_STORAGE_PATH, workspace_id)
            if os.path.exists(workspace_dir):
                for filename in os.listdir(workspace_dir):
                    file_path = os.path.join(workspace_dir, filename)
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if file_time < older_than:
                        os.remove(file_path)
                        deleted_count += 1

        return deleted_count


file_service = FileService()
