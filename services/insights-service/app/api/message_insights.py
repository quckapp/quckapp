"""Message insights API endpoints."""

from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.message_service import MessageInsightsService
from app.schemas.message import (
    MessageStatsResponse,
    HourlyDistributionResponse,
    ChannelAnalyticsResponse,
)

router = APIRouter()


def get_message_service(db: AsyncSession = Depends(get_db)) -> MessageInsightsService:
    """Dependency for message insights service."""
    return MessageInsightsService(db)


@router.get("/stats", response_model=List[MessageStatsResponse])
async def get_message_stats(
    workspace_id: str = Query(..., description="Workspace ID"),
    stat_date: Optional[date] = Query(None, description="Date (defaults to today)"),
    channel_id: Optional[str] = Query(None, description="Filter by channel"),
    service: MessageInsightsService = Depends(get_message_service),
):
    """Get message stats for a specific date."""
    if not stat_date:
        stat_date = date.today()

    return await service.get_message_stats(workspace_id, stat_date, channel_id)


@router.get("/hourly", response_model=HourlyDistributionResponse)
async def get_hourly_distribution(
    workspace_id: str = Query(..., description="Workspace ID"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    channel_id: Optional[str] = Query(None, description="Filter by channel"),
    service: MessageInsightsService = Depends(get_message_service),
):
    """Get message distribution by hour of day."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    return await service.get_hourly_distribution(
        workspace_id, start_date, end_date, channel_id
    )


@router.get("/channels/{channel_id}", response_model=ChannelAnalyticsResponse)
async def get_channel_analytics(
    channel_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    service: MessageInsightsService = Depends(get_message_service),
):
    """Get analytics for a specific channel."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    return await service.get_channel_analytics(
        workspace_id, channel_id, start_date, end_date
    )


@router.post("/stats")
async def record_message_stats(
    workspace_id: str,
    stat_date: date,
    hour: int,
    channel_id: Optional[str] = None,
    stats_data: dict = {},
    service: MessageInsightsService = Depends(get_message_service),
):
    """Record message stats (internal API)."""
    if hour < 0 or hour > 23:
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23")

    result = await service.record_message_stats(
        workspace_id, stat_date, hour, channel_id, stats_data
    )
    return {
        "id": result.id,
        "workspace_id": result.workspace_id,
        "date": str(result.stat_date),
        "hour": result.hour,
    }
