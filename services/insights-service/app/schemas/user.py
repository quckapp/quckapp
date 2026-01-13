"""User insight schemas."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.common import MetricValue, TimeSeriesPoint


class UserActivityResponse(BaseModel):
    """User activity for a specific date."""

    user_id: str
    workspace_id: str
    activity_date: date
    sessions_count: int
    total_active_minutes: int
    messages_sent: int
    messages_in_channels: int
    messages_in_dms: int
    thread_replies: int
    reactions_given: int
    reactions_received: int
    files_uploaded: int
    mentions_sent: int
    mentions_received: int
    engagement_score: Optional[float] = None

    class Config:
        from_attributes = True


class UserEngagementResponse(BaseModel):
    """User engagement analysis over time."""

    user_id: str
    workspace_id: str
    period_start: date
    period_end: date

    # Summary metrics
    total_active_days: int
    total_messages: int
    total_reactions: int
    avg_daily_messages: float
    avg_session_duration_minutes: float

    # Engagement scoring
    engagement_score: float
    engagement_level: str  # "high", "medium", "low", "inactive"

    # Trends
    daily_activity: List[TimeSeriesPoint]
    message_trend: List[TimeSeriesPoint]

    # Comparison with workspace average
    vs_workspace_avg: Optional[float] = None  # percentage difference

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class TopUsersResponse(BaseModel):
    """Top users by various metrics."""

    workspace_id: str
    period_start: date
    period_end: date
    metric_type: str  # "messages", "reactions", "engagement", "active_time"

    users: List["TopUserItem"]
    total_users_analyzed: int

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class TopUserItem(BaseModel):
    """A user in the top users list."""

    rank: int
    user_id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    metric_value: float
    metric_label: str
    change_from_previous: Optional[float] = None  # percentage
    badges: List[str] = []  # e.g., ["top_contributor", "most_improved"]


class UserComparisonResponse(BaseModel):
    """Compare multiple users."""

    workspace_id: str
    period_start: date
    period_end: date
    users: List["UserComparisonItem"]


class UserComparisonItem(BaseModel):
    """User data for comparison."""

    user_id: str
    display_name: Optional[str] = None
    metrics: List[MetricValue]


# Update forward references
TopUsersResponse.model_rebuild()
UserComparisonResponse.model_rebuild()
