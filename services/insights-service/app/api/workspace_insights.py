"""Workspace insights API endpoints."""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.workspace_service import WorkspaceInsightsService
from app.schemas.workspace import (
    WorkspaceMetricsResponse,
    WorkspaceTrendResponse,
    WorkspaceOverview,
)

router = APIRouter()


def get_workspace_service(db: AsyncSession = Depends(get_db)) -> WorkspaceInsightsService:
    """Dependency for workspace insights service."""
    return WorkspaceInsightsService(db)


@router.get("/{workspace_id}/metrics", response_model=Optional[WorkspaceMetricsResponse])
async def get_workspace_metrics(
    workspace_id: str,
    metric_date: Optional[date] = Query(None, description="Date for metrics (defaults to today)"),
    service: WorkspaceInsightsService = Depends(get_workspace_service),
):
    """Get workspace metrics for a specific date."""
    if not metric_date:
        metric_date = date.today()

    metrics = await service.get_metrics_for_date(workspace_id, metric_date)
    if not metrics:
        raise HTTPException(
            status_code=404,
            detail=f"No metrics found for workspace {workspace_id} on {metric_date}",
        )
    return metrics


@router.get("/{workspace_id}/trend", response_model=WorkspaceTrendResponse)
async def get_workspace_trend(
    workspace_id: str,
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not specified)"),
    service: WorkspaceInsightsService = Depends(get_workspace_service),
):
    """Get workspace metrics trend over time."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    return await service.get_metrics_trend(workspace_id, start_date, end_date)


@router.get("/{workspace_id}/overview", response_model=WorkspaceOverview)
async def get_workspace_overview(
    workspace_id: str,
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not specified)"),
    service: WorkspaceInsightsService = Depends(get_workspace_service),
):
    """Get complete workspace overview with key metrics and trends."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    return await service.get_workspace_overview(workspace_id, start_date, end_date)


@router.post("/{workspace_id}/metrics")
async def record_workspace_metrics(
    workspace_id: str,
    metric_date: date,
    metrics_data: dict,
    service: WorkspaceInsightsService = Depends(get_workspace_service),
):
    """Record or update workspace metrics (internal API)."""
    result = await service.record_daily_metrics(workspace_id, metric_date, metrics_data)
    return {"id": result.id, "workspace_id": result.workspace_id, "date": str(result.metric_date)}
