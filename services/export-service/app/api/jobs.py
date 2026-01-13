"""Export jobs API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.export_service import ExportService
from app.schemas.export import ExportJobResponse, ExportJobListResponse

router = APIRouter()


def get_export_service(db: AsyncSession = Depends(get_db)) -> ExportService:
    """Dependency for export service."""
    return ExportService(db)


@router.get("/{job_id}", response_model=ExportJobResponse)
async def get_job(
    job_id: str,
    service: ExportService = Depends(get_export_service),
):
    """Get export job status and details.

    Returns the current status of the export job, including
    progress percentage and download URL when complete.
    """
    job = await service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    return ExportJobResponse.model_validate(job)


@router.get("", response_model=ExportJobListResponse)
async def list_jobs(
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    export_type: Optional[str] = Query(None, description="Filter by export type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    service: ExportService = Depends(get_export_service),
):
    """List export jobs for a workspace."""
    return await service.list_jobs(
        workspace_id, page, page_size, export_type, status
    )


@router.post("/{job_id}/cancel", status_code=200)
async def cancel_job(
    job_id: str,
    service: ExportService = Depends(get_export_service),
):
    """Cancel a pending or processing export job."""
    cancelled = await service.cancel_job(job_id)
    if not cancelled:
        raise HTTPException(
            status_code=400,
            detail="Job cannot be cancelled (not found or already completed)",
        )
    return {"message": "Export job cancelled", "job_id": job_id}


@router.get("/{job_id}/download")
async def get_download_url(
    job_id: str,
    service: ExportService = Depends(get_export_service),
):
    """Get the download URL for a completed export.

    The URL is time-limited and will expire after 1 hour.
    """
    job = await service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")

    if job.status.value != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Export job is not complete. Current status: {job.status.value}",
        )

    if not job.file_url:
        raise HTTPException(
            status_code=404,
            detail="No file available for this export",
        )

    return {
        "job_id": job_id,
        "download_url": job.file_url,
        "file_size_bytes": job.file_size_bytes,
        "expires_at": job.expires_at.isoformat() if job.expires_at else None,
    }
