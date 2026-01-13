from fastapi import APIRouter, Query, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import logging

from services.database import get_db, get_redis
from services.analytics_service import AnalyticsService
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Request/Response Models ====================

class TrackEventRequest(BaseModel):
    event_type: str = Field(..., description="Type of event (e.g., message.sent, call.started)")
    user_id: Optional[str] = None
    workspace_id: Optional[str] = None
    channel_id: Optional[str] = None
    session_id: Optional[str] = None
    source_service: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None


class MetricRequest(BaseModel):
    metric_name: str
    value: float
    workspace_id: Optional[str] = None
    dimensions: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None


class BatchEventRequest(BaseModel):
    events: List[TrackEventRequest]


class ExportRequest(BaseModel):
    report_type: str = Field(..., description="Type of report: events, messages, calls, users, activity")
    start_date: datetime
    end_date: datetime
    format: str = Field(default="csv", description="Export format: csv or json")
    workspace_id: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)


class AnalyticsResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: Optional[str] = None


# ==================== Helper Functions ====================

async def get_analytics_service(
    db: AsyncSession = Depends(get_db),
) -> AnalyticsService:
    """Get analytics service instance"""
    redis_client = get_redis()
    return AnalyticsService(db, redis_client)


# ==================== Event Tracking Endpoints ====================

@router.post("/track", response_model=AnalyticsResponse)
async def track_event(
    request: TrackEventRequest,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Track a single analytics event"""
    try:
        event = await service.track_event(
            event_type=request.event_type,
            user_id=request.user_id,
            workspace_id=request.workspace_id,
            channel_id=request.channel_id,
            session_id=request.session_id,
            source_service=request.source_service,
            properties=request.properties,
            timestamp=request.timestamp,
        )

        return AnalyticsResponse(
            success=True,
            data={"event_id": event.id, "event_type": event.event_type},
            message="Event tracked successfully",
        )
    except Exception as e:
        logger.error(f"Failed to track event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/batch", response_model=AnalyticsResponse)
async def track_events_batch(
    request: BatchEventRequest,
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Track multiple events in batch"""
    tracked_count = 0
    errors = []

    for event_req in request.events:
        try:
            await service.track_event(
                event_type=event_req.event_type,
                user_id=event_req.user_id,
                workspace_id=event_req.workspace_id,
                channel_id=event_req.channel_id,
                session_id=event_req.session_id,
                source_service=event_req.source_service,
                properties=event_req.properties,
                timestamp=event_req.timestamp,
            )
            tracked_count += 1
        except Exception as e:
            errors.append({"event_type": event_req.event_type, "error": str(e)})

    return AnalyticsResponse(
        success=len(errors) == 0,
        data={
            "tracked": tracked_count,
            "failed": len(errors),
            "errors": errors if errors else None,
        },
        message=f"Tracked {tracked_count} of {len(request.events)} events",
    )


@router.post("/metrics", response_model=AnalyticsResponse)
async def record_metric(
    request: MetricRequest,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Record a metric value"""
    try:
        metric = await service.record_metric(
            metric_name=request.metric_name,
            value=request.value,
            workspace_id=request.workspace_id,
            dimensions=request.dimensions,
            timestamp=request.timestamp,
        )

        return AnalyticsResponse(
            success=True,
            data={"metric_id": metric.id, "metric_name": metric.metric_name},
            message="Metric recorded successfully",
        )
    except Exception as e:
        logger.error(f"Failed to record metric: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Dashboard Endpoints ====================

@router.get("/dashboard/overview", response_model=AnalyticsResponse)
async def get_dashboard_overview(
    workspace_id: Optional[str] = None,
    start_date: datetime = Query(default_factory=lambda: datetime.now() - timedelta(days=7)),
    end_date: datetime = Query(default_factory=datetime.now),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get dashboard overview metrics for a workspace or globally"""
    try:
        data = await service.get_dashboard_overview(
            workspace_id=workspace_id,
            start_date=start_date,
            end_date=end_date,
        )

        return AnalyticsResponse(success=True, data=data)
    except Exception as e:
        logger.error(f"Failed to get dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}/activity", response_model=AnalyticsResponse)
async def get_user_activity(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get activity analytics for a specific user"""
    try:
        data = await service.get_user_activity(user_id=user_id, days=days)

        return AnalyticsResponse(success=True, data=data)
    except Exception as e:
        logger.error(f"Failed to get user activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/stats", response_model=AnalyticsResponse)
async def get_message_stats(
    workspace_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    start_date: datetime = Query(default_factory=lambda: datetime.now() - timedelta(days=7)),
    end_date: datetime = Query(default_factory=datetime.now),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get message statistics for a workspace or channel"""
    try:
        data = await service.get_message_stats(
            workspace_id=workspace_id,
            channel_id=channel_id,
            start_date=start_date,
            end_date=end_date,
        )

        return AnalyticsResponse(success=True, data=data)
    except Exception as e:
        logger.error(f"Failed to get message stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/stats", response_model=AnalyticsResponse)
async def get_call_stats(
    workspace_id: Optional[str] = None,
    start_date: datetime = Query(default_factory=lambda: datetime.now() - timedelta(days=7)),
    end_date: datetime = Query(default_factory=datetime.now),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get call statistics for a workspace"""
    try:
        data = await service.get_call_stats(
            workspace_id=workspace_id,
            start_date=start_date,
            end_date=end_date,
        )

        return AnalyticsResponse(success=True, data=data)
    except Exception as e:
        logger.error(f"Failed to get call stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retention", response_model=AnalyticsResponse)
async def get_retention_metrics(
    workspace_id: Optional[str] = None,
    cohort_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get user retention metrics for a cohort"""
    try:
        data = await service.get_retention_metrics(
            workspace_id=workspace_id,
            cohort_date=cohort_date,
        )

        return AnalyticsResponse(success=True, data=data)
    except Exception as e:
        logger.error(f"Failed to get retention metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Export Endpoints ====================

@router.post("/export", response_model=AnalyticsResponse)
async def create_export(
    request: ExportRequest,
    user_id: str = Query(..., description="User requesting the export"),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Create an analytics export job"""
    try:
        job = await service.create_export_job(
            user_id=user_id,
            report_type=request.report_type,
            start_date=request.start_date,
            end_date=request.end_date,
            format=request.format,
            workspace_id=request.workspace_id,
            filters=request.filters,
        )

        return AnalyticsResponse(
            success=True,
            data={
                "job_id": job.id,
                "status": job.status,
                "created_at": job.created_at.isoformat(),
            },
            message="Export job created. Check status for download URL.",
        )
    except Exception as e:
        logger.error(f"Failed to create export: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/{job_id}", response_model=AnalyticsResponse)
async def get_export_status(
    job_id: str,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get export job status and download URL"""
    try:
        job = await service.get_export_job(job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Export job not found")

        return AnalyticsResponse(
            success=True,
            data={
                "job_id": job.id,
                "status": job.status,
                "report_type": job.report_type,
                "format": job.format,
                "file_url": job.file_url,
                "file_size_bytes": job.file_size_bytes,
                "row_count": job.row_count,
                "error_message": job.error_message,
                "created_at": job.created_at.isoformat(),
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get export status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/user/{user_id}", response_model=AnalyticsResponse)
async def list_user_exports(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=100),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """List export jobs for a user"""
    try:
        jobs = await service.list_user_export_jobs(user_id=user_id, limit=limit)

        return AnalyticsResponse(
            success=True,
            data={
                "exports": [
                    {
                        "job_id": job.id,
                        "status": job.status,
                        "report_type": job.report_type,
                        "format": job.format,
                        "file_url": job.file_url,
                        "created_at": job.created_at.isoformat(),
                    }
                    for job in jobs
                ],
                "total": len(jobs),
            },
        )
    except Exception as e:
        logger.error(f"Failed to list exports: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Real-time Stats Endpoints ====================

@router.get("/realtime/active-users", response_model=AnalyticsResponse)
async def get_realtime_active_users(
    workspace_id: Optional[str] = None,
):
    """Get real-time count of active users from Redis"""
    redis_client = get_redis()
    if not redis_client:
        return AnalyticsResponse(
            success=True,
            data={"active_users": 0, "source": "unavailable"},
        )

    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"analytics:users:{today}"

        if workspace_id:
            key = f"analytics:users:{workspace_id}:{today}"

        active_count = await redis_client.scard(key)

        return AnalyticsResponse(
            success=True,
            data={
                "active_users": active_count,
                "date": today,
                "source": "realtime",
            },
        )
    except Exception as e:
        logger.error(f"Failed to get realtime active users: {e}")
        return AnalyticsResponse(
            success=True,
            data={"active_users": 0, "source": "error"},
        )


@router.get("/realtime/events", response_model=AnalyticsResponse)
async def get_realtime_event_counts(
    workspace_id: Optional[str] = None,
):
    """Get real-time event counts from Redis"""
    redis_client = get_redis()
    if not redis_client:
        return AnalyticsResponse(
            success=True,
            data={"events": {}, "source": "unavailable"},
        )

    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"analytics:events:{today}"

        events = await redis_client.hgetall(key)

        return AnalyticsResponse(
            success=True,
            data={
                "events": {k: int(v) for k, v in events.items()},
                "date": today,
                "source": "realtime",
            },
        )
    except Exception as e:
        logger.error(f"Failed to get realtime events: {e}")
        return AnalyticsResponse(
            success=True,
            data={"events": {}, "source": "error"},
        )
