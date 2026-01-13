"""Reports API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.report_service import ReportService
from app.schemas.report import (
    ReportRequest,
    ReportResponse,
    ReportListResponse,
)

router = APIRouter()


def get_report_service(db: AsyncSession = Depends(get_db)) -> ReportService:
    """Dependency for report service."""
    return ReportService(db)


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(
    request: ReportRequest,
    x_user_id: str = Header(..., description="User ID from auth"),
    service: ReportService = Depends(get_report_service),
):
    """Create a new insight report."""
    return await service.create_report(request, x_user_id)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    service: ReportService = Depends(get_report_service),
):
    """Get a report by ID."""
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("", response_model=ReportListResponse)
async def list_reports(
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    service: ReportService = Depends(get_report_service),
):
    """List reports for a workspace."""
    return await service.list_reports(workspace_id, page, page_size, report_type)


@router.delete("/{report_id}", status_code=204)
async def delete_report(
    report_id: str,
    service: ReportService = Depends(get_report_service),
):
    """Delete a report."""
    deleted = await service.delete_report(report_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found")
    return None
