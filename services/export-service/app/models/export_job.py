"""Export Job model."""

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Enum, JSON, Integer, BigInteger
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class ExportType(str, PyEnum):
    """Export type enumeration."""

    MESSAGES = "messages"
    USERS = "users"
    CHANNELS = "channels"
    FILES = "files"
    AUDIT_LOGS = "audit_logs"
    WORKSPACE_DATA = "workspace_data"
    COMPLIANCE_REPORT = "compliance_report"
    GDPR_EXPORT = "gdpr_export"


class ExportFormat(str, PyEnum):
    """Export format enumeration."""

    JSON = "json"
    CSV = "csv"
    XLSX = "xlsx"
    PDF = "pdf"
    ZIP = "zip"


class ExportStatus(str, PyEnum):
    """Export status enumeration."""

    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ExportJob(Base):
    """Export job entity."""

    __tablename__ = "export_jobs"

    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    export_type = Column(Enum(ExportType), nullable=False)
    export_format = Column(Enum(ExportFormat), nullable=False, default=ExportFormat.JSON)
    status = Column(Enum(ExportStatus), nullable=False, default=ExportStatus.PENDING)

    # Request parameters
    parameters = Column(JSON, nullable=True)
    date_from = Column(DateTime, nullable=True)
    date_to = Column(DateTime, nullable=True)

    # Progress tracking
    total_records = Column(BigInteger, nullable=True)
    processed_records = Column(BigInteger, nullable=False, default=0)
    progress_percent = Column(Integer, nullable=False, default=0)

    # Result
    file_url = Column(Text, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    error_message = Column(Text, nullable=True)

    # Metadata
    created_by = Column(CHAR(36), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<ExportJob(id={self.id}, type={self.export_type}, status={self.status})>"
