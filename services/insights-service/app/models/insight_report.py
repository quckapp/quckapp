"""Insight Report model."""

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Enum, JSON
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class ReportType(str, PyEnum):
    """Report type enumeration."""

    WORKSPACE_SUMMARY = "workspace_summary"
    USER_ENGAGEMENT = "user_engagement"
    MESSAGE_ANALYTICS = "message_analytics"
    CHANNEL_PERFORMANCE = "channel_performance"
    TEAM_PRODUCTIVITY = "team_productivity"
    CUSTOM = "custom"


class ReportStatus(str, PyEnum):
    """Report status enumeration."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class InsightReport(Base):
    """Insight report entity."""

    __tablename__ = "insight_reports"

    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    report_type = Column(
        Enum(ReportType),
        nullable=False,
        default=ReportType.WORKSPACE_SUMMARY,
    )
    status = Column(
        Enum(ReportStatus),
        nullable=False,
        default=ReportStatus.PENDING,
    )
    parameters = Column(JSON, nullable=True)
    result_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    created_by = Column(CHAR(36), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<InsightReport(id={self.id}, name={self.name}, type={self.report_type})>"
