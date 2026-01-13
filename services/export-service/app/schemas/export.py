"""Export schema definitions."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class ExportType(str, Enum):
    """Export type options."""

    MESSAGES = "messages"
    USERS = "users"
    CHANNELS = "channels"
    FILES = "files"
    AUDIT_LOGS = "audit_logs"
    WORKSPACE_DATA = "workspace_data"
    COMPLIANCE_REPORT = "compliance_report"
    GDPR_EXPORT = "gdpr_export"


class ExportFormat(str, Enum):
    """Export format options."""

    JSON = "json"
    CSV = "csv"
    XLSX = "xlsx"
    PDF = "pdf"
    ZIP = "zip"


class ExportStatus(str, Enum):
    """Export status options."""

    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ExportRequest(BaseModel):
    """Request to create an export job."""

    export_type: ExportType
    export_format: ExportFormat = ExportFormat.JSON
    workspace_id: str
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    parameters: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


class ExportResponse(BaseModel):
    """Response after creating an export job."""

    job_id: str
    status: str
    message: str


class ExportJobResponse(BaseModel):
    """Export job details response."""

    id: str
    workspace_id: str
    export_type: str
    export_format: str
    status: str
    parameters: Optional[Dict[str, Any]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    total_records: Optional[int] = None
    processed_records: int = 0
    progress_percent: int = 0
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    created_by: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportJobListResponse(BaseModel):
    """List of export jobs response."""

    jobs: List[ExportJobResponse]
    total: int
    page: int
    page_size: int


class ExportProgress(BaseModel):
    """Export job progress update."""

    job_id: str
    status: str
    progress_percent: int
    processed_records: int
    total_records: Optional[int] = None
    message: Optional[str] = None
