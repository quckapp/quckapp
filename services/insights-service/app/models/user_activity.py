"""User Activity model."""

from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Integer, Float, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class UserActivity(Base):
    """Daily user activity metrics entity."""

    __tablename__ = "user_activity"
    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", "activity_date", name="uq_user_workspace_date"),
    )

    id = Column(CHAR(36), primary_key=True)
    user_id = Column(CHAR(36), nullable=False, index=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    activity_date = Column(Date, nullable=False, index=True)

    # Session metrics
    sessions_count = Column(Integer, nullable=False, default=0)
    total_active_minutes = Column(Integer, nullable=False, default=0)
    first_activity_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)

    # Message metrics
    messages_sent = Column(Integer, nullable=False, default=0)
    messages_in_channels = Column(Integer, nullable=False, default=0)
    messages_in_dms = Column(Integer, nullable=False, default=0)
    thread_replies = Column(Integer, nullable=False, default=0)

    # Reaction metrics
    reactions_given = Column(Integer, nullable=False, default=0)
    reactions_received = Column(Integer, nullable=False, default=0)

    # File metrics
    files_uploaded = Column(Integer, nullable=False, default=0)
    files_downloaded = Column(Integer, nullable=False, default=0)

    # Interaction metrics
    mentions_sent = Column(Integer, nullable=False, default=0)
    mentions_received = Column(Integer, nullable=False, default=0)

    # Response metrics
    avg_response_time_seconds = Column(Float, nullable=True)
    response_rate = Column(Float, nullable=True)  # 0.0 - 1.0

    # Engagement score (calculated)
    engagement_score = Column(Float, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<UserActivity(user_id={self.user_id}, date={self.activity_date})>"
