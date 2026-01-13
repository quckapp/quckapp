"""Export API endpoints."""

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.export_service import ExportService
from app.schemas.export import (
    ExportRequest,
    ExportResponse,
    ExportType,
    ExportFormat,
)

router = APIRouter()


def get_export_service(db: AsyncSession = Depends(get_db)) -> ExportService:
    """Dependency for export service."""
    return ExportService(db)


@router.post("", response_model=ExportResponse, status_code=201)
async def create_export(
    request: ExportRequest,
    x_user_id: str = Header(..., description="User ID from auth"),
    service: ExportService = Depends(get_export_service),
):
    """Create a new data export job.

    Starts an asynchronous export job that will generate a downloadable file.
    Use the job ID to check status and get the download URL when complete.
    """
    job = await service.create_export_job(request, x_user_id)

    return ExportResponse(
        job_id=job.id,
        status=job.status.value,
        message=f"Export job created. Check status at /api/v1/jobs/{job.id}",
    )


@router.get("/types")
async def list_export_types():
    """List available export types."""
    return {
        "types": [
            {"value": t.value, "label": t.value.replace("_", " ").title()}
            for t in ExportType
        ]
    }


@router.get("/formats")
async def list_export_formats():
    """List available export formats."""
    return {
        "formats": [
            {"value": f.value, "label": f.value.upper()}
            for f in ExportFormat
        ]
    }
