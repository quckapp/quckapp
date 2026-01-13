from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Index, BigInteger, Date, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()


class AnalyticsEvent(Base):
    """Stores individual analytics events from various services"""
    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String(100), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    workspace_id = Column(String(36), nullable=True, index=True)
    channel_id = Column(String(36), nullable=True, index=True)
    session_id = Column(String(36), nullable=True)
    source_service = Column(String(50), nullable=True)
    properties = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_event_type_timestamp", "event_type", "timestamp"),
        Index("idx_workspace_timestamp", "workspace_id", "timestamp"),
        Index("idx_user_workspace", "user_id", "workspace_id"),
    )


class AnalyticsMetric(Base):
    """Stores time-series metrics data"""
    __tablename__ = "analytics_metrics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    metric_name = Column(String(100), nullable=False, index=True)
    value = Column(Float, nullable=False)
    workspace_id = Column(String(36), nullable=True, index=True)
    dimensions = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_metric_name_timestamp", "metric_name", "timestamp"),
        Index("idx_metric_workspace", "metric_name", "workspace_id", "timestamp"),
    )


class DailyAggregation(Base):
    """Pre-aggregated daily statistics for fast dashboard queries"""
    __tablename__ = "daily_aggregations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    workspace_id = Column(String(36), nullable=True, index=True)
    metric_type = Column(String(50), nullable=False)  # messages, calls, users, files, etc.

    # Counts
    total_count = Column(BigInteger, default=0)
    unique_users = Column(Integer, default=0)

    # For messages
    message_count = Column(BigInteger, default=0)
    reaction_count = Column(BigInteger, default=0)
    thread_count = Column(BigInteger, default=0)

    # For calls
    call_count = Column(Integer, default=0)
    call_duration_seconds = Column(BigInteger, default=0)

    # For files
    file_count = Column(Integer, default=0)
    file_size_bytes = Column(BigInteger, default=0)

    # Hourly breakdown (JSON array of 24 values)
    hourly_breakdown = Column(JSON, default=[0]*24)

    # Additional dimensions
    breakdown_by_type = Column(JSON, default={})

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_date_workspace_metric", "date", "workspace_id", "metric_type", unique=True),
    )


class UserActivity(Base):
    """Tracks user activity for engagement analytics"""
    __tablename__ = "user_activity"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
    workspace_id = Column(String(36), nullable=True, index=True)
    date = Column(Date, nullable=False, index=True)

    # Activity counts
    messages_sent = Column(Integer, default=0)
    messages_read = Column(Integer, default=0)
    reactions_given = Column(Integer, default=0)
    files_uploaded = Column(Integer, default=0)
    calls_joined = Column(Integer, default=0)
    call_duration_seconds = Column(Integer, default=0)

    # Engagement metrics
    active_minutes = Column(Integer, default=0)
    channels_visited = Column(Integer, default=0)

    # Session info
    session_count = Column(Integer, default=0)
    first_seen_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_user_date", "user_id", "date", unique=True),
        Index("idx_workspace_date", "workspace_id", "date"),
    )


class RetentionCohort(Base):
    """Stores cohort retention data"""
    __tablename__ = "retention_cohorts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    cohort_date = Column(Date, nullable=False, index=True)
    workspace_id = Column(String(36), nullable=True, index=True)

    # Cohort size
    cohort_size = Column(Integer, default=0)

    # Retention by day (JSON: {"day_1": count, "day_7": count, ...})
    retention_data = Column(JSON, default={})

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_cohort_workspace", "cohort_date", "workspace_id", unique=True),
    )


class ExportJob(Base):
    """Tracks analytics export jobs"""
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    workspace_id = Column(String(36), nullable=True)
    report_type = Column(String(50), nullable=False)
    format = Column(String(10), default="csv")
    status = Column(String(20), default="pending")  # pending, processing, completed, failed

    # Query parameters
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    filters = Column(JSON, default={})

    # Result
    file_url = Column(Text, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    row_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_user_status", "user_id", "status"),
    )
