"""Message insight schemas."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.common import TimeSeriesPoint, DistributionItem


class MessageStatsResponse(BaseModel):
    """Message statistics for a time period."""

    workspace_id: str
    channel_id: Optional[str] = None
    stat_date: date
    hour: Optional[int] = None

    message_count: int
    thread_count: int
    reply_count: int
    unique_senders: int
    unique_participants: int
    avg_message_length: Optional[float] = None
    messages_with_files: int
    messages_with_links: int
    messages_with_mentions: int
    total_reactions: int

    class Config:
        from_attributes = True


class HourlyDistributionResponse(BaseModel):
    """Message distribution by hour."""

    workspace_id: str
    channel_id: Optional[str] = None
    period_start: date
    period_end: date

    hourly_data: List["HourlyDataPoint"]
    peak_hour: int
    peak_hour_avg_messages: float
    quietest_hour: int
    quietest_hour_avg_messages: float

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class HourlyDataPoint(BaseModel):
    """Data for a specific hour."""

    hour: int  # 0-23
    avg_messages: float
    total_messages: int
    percentage_of_total: float


class ChannelAnalyticsResponse(BaseModel):
    """Analytics for a specific channel."""

    workspace_id: str
    channel_id: str
    channel_name: Optional[str] = None
    period_start: date
    period_end: date

    # Summary metrics
    total_messages: int
    total_threads: int
    total_replies: int
    unique_contributors: int
    avg_daily_messages: float

    # Trends
    message_trend: List[TimeSeriesPoint]
    contributor_trend: List[TimeSeriesPoint]

    # Top contributors
    top_contributors: List["ChannelContributor"]

    # Content breakdown
    content_types: List[DistributionItem]

    # Engagement
    avg_thread_replies: float
    avg_reactions_per_message: float

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelContributor(BaseModel):
    """A contributor to a channel."""

    user_id: str
    display_name: Optional[str] = None
    message_count: int
    reply_count: int
    percentage_of_total: float


class ChannelComparisonResponse(BaseModel):
    """Compare multiple channels."""

    workspace_id: str
    period_start: date
    period_end: date
    channels: List["ChannelComparisonItem"]


class ChannelComparisonItem(BaseModel):
    """Channel data for comparison."""

    channel_id: str
    channel_name: str
    total_messages: int
    active_users: int
    avg_response_time_minutes: Optional[float] = None
    engagement_score: Optional[float] = None


# Update forward references
HourlyDistributionResponse.model_rebuild()
ChannelAnalyticsResponse.model_rebuild()
ChannelComparisonResponse.model_rebuild()
