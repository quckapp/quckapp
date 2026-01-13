"""Message Stats model."""

from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Integer, Float, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class MessageStats(Base):
    """Hourly message statistics entity."""

    __tablename__ = "message_stats"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "channel_id", "stat_date", "hour",
            name="uq_workspace_channel_date_hour"
        ),
    )

    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    channel_id = Column(CHAR(36), nullable=True, index=True)  # NULL for workspace-wide
    stat_date = Column(Date, nullable=False, index=True)
    hour = Column(Integer, nullable=False)  # 0-23

    # Message counts
    message_count = Column(Integer, nullable=False, default=0)
    thread_count = Column(Integer, nullable=False, default=0)
    reply_count = Column(Integer, nullable=False, default=0)

    # User metrics
    unique_senders = Column(Integer, nullable=False, default=0)
    unique_participants = Column(Integer, nullable=False, default=0)

    # Content metrics
    avg_message_length = Column(Float, nullable=True)
    messages_with_files = Column(Integer, nullable=False, default=0)
    messages_with_links = Column(Integer, nullable=False, default=0)
    messages_with_mentions = Column(Integer, nullable=False, default=0)
    messages_with_reactions = Column(Integer, nullable=False, default=0)

    # Reaction breakdown
    total_reactions = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<MessageStats(workspace_id={self.workspace_id}, date={self.stat_date}, hour={self.hour})>"
