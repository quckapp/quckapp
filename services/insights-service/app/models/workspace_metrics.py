"""Workspace Metrics model."""

from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Integer, Float, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class WorkspaceMetrics(Base):
    """Daily workspace metrics entity."""

    __tablename__ = "workspace_metrics"
    __table_args__ = (
        UniqueConstraint("workspace_id", "metric_date", name="uq_workspace_date"),
    )

    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    metric_date = Column(Date, nullable=False, index=True)

    # User metrics
    total_users = Column(Integer, nullable=False, default=0)
    active_users = Column(Integer, nullable=False, default=0)
    new_users = Column(Integer, nullable=False, default=0)

    # Message metrics
    total_messages = Column(Integer, nullable=False, default=0)
    direct_messages = Column(Integer, nullable=False, default=0)
    channel_messages = Column(Integer, nullable=False, default=0)
    thread_replies = Column(Integer, nullable=False, default=0)

    # Reaction metrics
    total_reactions = Column(Integer, nullable=False, default=0)
    unique_reactors = Column(Integer, nullable=False, default=0)

    # File metrics
    files_shared = Column(Integer, nullable=False, default=0)
    total_file_size_mb = Column(Float, nullable=False, default=0.0)

    # Channel metrics
    total_channels = Column(Integer, nullable=False, default=0)
    active_channels = Column(Integer, nullable=False, default=0)
    new_channels = Column(Integer, nullable=False, default=0)

    # Engagement metrics
    avg_response_time_seconds = Column(Float, nullable=True)
    peak_hour = Column(Integer, nullable=True)  # 0-23
    engagement_score = Column(Float, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<WorkspaceMetrics(workspace_id={self.workspace_id}, date={self.metric_date})>"
