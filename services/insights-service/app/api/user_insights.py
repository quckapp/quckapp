"""User insights API endpoints."""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.user_service import UserInsightsService
from app.schemas.user import (
    UserActivityResponse,
    UserEngagementResponse,
    TopUsersResponse,
)

router = APIRouter()


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserInsightsService:
    """Dependency for user insights service."""
    return UserInsightsService(db)


@router.get("/{user_id}/activity", response_model=Optional[UserActivityResponse])
async def get_user_activity(
    user_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    activity_date: Optional[date] = Query(None, description="Date (defaults to today)"),
    service: UserInsightsService = Depends(get_user_service),
):
    """Get user activity for a specific date."""
    if not activity_date:
        activity_date = date.today()

    activity = await service.get_user_activity(user_id, workspace_id, activity_date)
    if not activity:
        raise HTTPException(
            status_code=404,
            detail=f"No activity found for user {user_id} on {activity_date}",
        )
    return activity


@router.get("/{user_id}/engagement", response_model=UserEngagementResponse)
async def get_user_engagement(
    user_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    service: UserInsightsService = Depends(get_user_service),
):
    """Get user engagement analysis over a date range."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    return await service.get_user_engagement(user_id, workspace_id, start_date, end_date)


@router.get("/top", response_model=TopUsersResponse)
async def get_top_users(
    workspace_id: str = Query(..., description="Workspace ID"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    metric_type: str = Query(
        "messages",
        description="Metric to rank by: messages, reactions, active_time, files",
    ),
    limit: int = Query(10, ge=1, le=100, description="Number of users to return"),
    service: UserInsightsService = Depends(get_user_service),
):
    """Get top users by specified metric."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    valid_metrics = ["messages", "reactions", "active_time", "files"]
    if metric_type not in valid_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metric_type. Must be one of: {valid_metrics}",
        )

    return await service.get_top_users(
        workspace_id, start_date, end_date, metric_type, limit
    )


@router.post("/{user_id}/activity")
async def record_user_activity(
    user_id: str,
    workspace_id: str,
    activity_date: date,
    activity_data: dict,
    service: UserInsightsService = Depends(get_user_service),
):
    """Record or update user activity (internal API)."""
    result = await service.record_user_activity(
        user_id, workspace_id, activity_date, activity_data
    )
    return {
        "id": result.id,
        "user_id": result.user_id,
        "date": str(result.activity_date),
    }
