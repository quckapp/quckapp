"""Export job management service."""

import uuid
import json
import csv
import io
from datetime import datetime, timedelta
from typing import List, Optional, Any, Dict
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.models.export_job import ExportJob, ExportType, ExportFormat, ExportStatus
from app.schemas.export import (
    ExportRequest,
    ExportJobResponse,
    ExportJobListResponse,
)
from app.services.file_service import file_service

logger = structlog.get_logger()


class ExportService:
    """Service for managing export jobs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_export_job(
        self,
        request: ExportRequest,
        created_by: str,
    ) -> ExportJob:
        """Create a new export job."""
        job = ExportJob(
            id=str(uuid.uuid4()),
            workspace_id=request.workspace_id,
            export_type=ExportType(request.export_type),
            export_format=ExportFormat(request.export_format),
            status=ExportStatus.PENDING,
            parameters=request.parameters,
            date_from=request.date_from,
            date_to=request.date_to,
            created_by=created_by,
            expires_at=datetime.utcnow() + timedelta(hours=settings.EXPORT_EXPIRY_HOURS),
        )

        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        # Start processing (in production, this would be queued)
        await self._process_export(job)

        return job

    async def get_job(self, job_id: str) -> Optional[ExportJob]:
        """Get an export job by ID."""
        query = select(ExportJob).where(ExportJob.id == job_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_jobs(
        self,
        workspace_id: str,
        page: int = 1,
        page_size: int = 20,
        export_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> ExportJobListResponse:
        """List export jobs for a workspace."""
        conditions = [ExportJob.workspace_id == workspace_id]

        if export_type:
            conditions.append(ExportJob.export_type == ExportType(export_type))
        if status:
            conditions.append(ExportJob.status == ExportStatus(status))

        # Count total
        count_query = select(ExportJob).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = len(count_result.scalars().all())

        # Get page
        offset = (page - 1) * page_size
        query = (
            select(ExportJob)
            .where(and_(*conditions))
            .order_by(desc(ExportJob.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        jobs = result.scalars().all()

        return ExportJobListResponse(
            jobs=[ExportJobResponse.model_validate(j) for j in jobs],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel an export job."""
        job = await self.get_job(job_id)
        if not job:
            return False

        if job.status in [ExportStatus.COMPLETED, ExportStatus.FAILED]:
            return False

        job.status = ExportStatus.CANCELLED
        await self.db.commit()
        return True

    async def _process_export(self, job: ExportJob) -> None:
        """Process the export job."""
        try:
            job.status = ExportStatus.PROCESSING
            job.started_at = datetime.utcnow()
            await self.db.commit()

            # Get data based on export type
            data = await self._fetch_export_data(job)

            if not data:
                job.status = ExportStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                job.total_records = 0
                job.processed_records = 0
                await self.db.commit()
                return

            # Generate file
            file_content = await self._generate_file(job, data)

            # Save file
            file_path = file_service.generate_file_path(
                job.workspace_id,
                job.export_type.value,
                job.export_format.value,
            )

            file_size = await file_service.save_file(file_path, file_content)

            # Get download URL
            file_url = await file_service.get_download_url(file_path)

            # Update job
            job.status = ExportStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.file_url = file_url
            job.file_size_bytes = file_size
            job.total_records = len(data)
            job.processed_records = len(data)
            job.progress_percent = 100

            await self.db.commit()

        except Exception as e:
            logger.error(f"Export job failed: {e}")
            job.status = ExportStatus.FAILED
            job.error_message = str(e)
            await self.db.commit()

    async def _fetch_export_data(self, job: ExportJob) -> List[Dict[str, Any]]:
        """Fetch data for the export based on type."""
        # In production, this would fetch from other services
        # For now, return sample data

        if job.export_type == ExportType.MESSAGES:
            return self._generate_sample_messages(100)
        elif job.export_type == ExportType.USERS:
            return self._generate_sample_users(50)
        elif job.export_type == ExportType.CHANNELS:
            return self._generate_sample_channels(20)
        elif job.export_type == ExportType.AUDIT_LOGS:
            return self._generate_sample_audit_logs(200)
        elif job.export_type == ExportType.WORKSPACE_DATA:
            return self._generate_workspace_data()
        else:
            return []

    def _generate_sample_messages(self, count: int) -> List[Dict]:
        """Generate sample message data."""
        return [
            {
                "id": str(uuid.uuid4()),
                "channel_id": str(uuid.uuid4()),
                "sender_id": str(uuid.uuid4()),
                "content": f"Sample message {i}",
                "created_at": datetime.utcnow().isoformat(),
            }
            for i in range(count)
        ]

    def _generate_sample_users(self, count: int) -> List[Dict]:
        """Generate sample user data."""
        return [
            {
                "id": str(uuid.uuid4()),
                "email": f"user{i}@example.com",
                "name": f"User {i}",
                "created_at": datetime.utcnow().isoformat(),
            }
            for i in range(count)
        ]

    def _generate_sample_channels(self, count: int) -> List[Dict]:
        """Generate sample channel data."""
        return [
            {
                "id": str(uuid.uuid4()),
                "name": f"channel-{i}",
                "type": "public",
                "created_at": datetime.utcnow().isoformat(),
            }
            for i in range(count)
        ]

    def _generate_sample_audit_logs(self, count: int) -> List[Dict]:
        """Generate sample audit log data."""
        return [
            {
                "id": str(uuid.uuid4()),
                "action": "user.login",
                "actor_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
            }
            for i in range(count)
        ]

    def _generate_workspace_data(self) -> List[Dict]:
        """Generate workspace summary data."""
        return [
            {
                "section": "summary",
                "total_users": 150,
                "total_channels": 45,
                "total_messages": 15000,
                "exported_at": datetime.utcnow().isoformat(),
            }
        ]

    async def _generate_file(
        self,
        job: ExportJob,
        data: List[Dict[str, Any]],
    ) -> bytes:
        """Generate file content based on format."""
        if job.export_format == ExportFormat.JSON:
            return json.dumps(data, indent=2, default=str).encode("utf-8")

        elif job.export_format == ExportFormat.CSV:
            if not data:
                return b""
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            return output.getvalue().encode("utf-8")

        elif job.export_format == ExportFormat.XLSX:
            return await self._generate_xlsx(data)

        else:
            return json.dumps(data, default=str).encode("utf-8")

    async def _generate_xlsx(self, data: List[Dict[str, Any]]) -> bytes:
        """Generate XLSX file."""
        try:
            import pandas as pd

            df = pd.DataFrame(data)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name="Export")
            return output.getvalue()
        except ImportError:
            # Fallback to JSON if pandas not available
            return json.dumps(data, default=str).encode("utf-8")

    async def cleanup_expired_jobs(self) -> int:
        """Clean up expired export jobs."""
        now = datetime.utcnow()

        query = select(ExportJob).where(
            and_(
                ExportJob.expires_at < now,
                ExportJob.status == ExportStatus.COMPLETED,
            )
        )
        result = await self.db.execute(query)
        expired_jobs = result.scalars().all()

        for job in expired_jobs:
            job.status = ExportStatus.EXPIRED
            # Optionally delete the file
            if job.file_url:
                await file_service.delete_file(job.file_url)

        await self.db.commit()
        return len(expired_jobs)
