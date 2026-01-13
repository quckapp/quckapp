"""Workspace insight schemas."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.common import MetricValue, TimeSeriesPoint, DistributionItem


class WorkspaceMetricsResponse(BaseModel):
    """Workspace metrics for a specific date."""

    workspace_id: str
    metric_date: date
    total_users: int
    active_users: int
    new_users: int
    total_messages: int
    direct_messages: int
    channel_messages: int
    thread_replies: int
    total_reactions: int
    files_shared: int
    total_channels: int
    active_channels: int
    engagement_score: Optional[float] = None

    class Config:
        from_attributes = True


class WorkspaceTrendResponse(BaseModel):
    """Workspace metrics trends over time."""

    workspace_id: str
    start_date: date
    end_date: date
    metrics: List[WorkspaceMetricsResponse]
    summary: "WorkspaceTrendSummary"


class WorkspaceTrendSummary(BaseModel):
    """Summary statistics for workspace trends."""

    total_messages: int
    avg_daily_messages: float
    total_active_users: int
    avg_daily_active_users: float
    peak_day: Optional[date] = None
    peak_day_messages: Optional[int] = None
    message_change_percent: Optional[float] = None
    user_change_percent: Optional[float] = None


class WorkspaceOverview(BaseModel):
    """Complete workspace overview with key metrics."""

    workspace_id: str
    workspace_name: Optional[str] = None
    period_start: date
    period_end: date

    # Key metrics with comparisons
    key_metrics: List[MetricValue]

    # Activity trends
    message_trend: List[TimeSeriesPoint]
    user_trend: List[TimeSeriesPoint]

    # Distributions
    message_type_distribution: List[DistributionItem]
    hourly_activity_distribution: List[DistributionItem]

    # Top performers
    top_channels: List["ChannelSummary"]
    most_active_users: List["UserSummary"]

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelSummary(BaseModel):
    """Summary of channel activity."""

    channel_id: str
    channel_name: str
    message_count: int
    active_users: int
    engagement_score: Optional[float] = None


class UserSummary(BaseModel):
    """Summary of user activity."""

    user_id: str
    display_name: Optional[str] = None
    message_count: int
    reaction_count: int
    active_days: int


# Update forward references
WorkspaceTrendResponse.model_rebuild()
WorkspaceOverview.model_rebuild()
