"""Report schemas."""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class ReportType(str, Enum):
    """Report type enumeration."""

    WORKSPACE_SUMMARY = "workspace_summary"
    USER_ENGAGEMENT = "user_engagement"
    MESSAGE_ANALYTICS = "message_analytics"
    CHANNEL_PERFORMANCE = "channel_performance"
    TEAM_PRODUCTIVITY = "team_productivity"
    CUSTOM = "custom"


class ReportStatus(str, Enum):
    """Report status enumeration."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportRequest(BaseModel):
    """Request to create a new report."""

    name: str = Field(..., min_length=1, max_length=255)
    report_type: ReportType
    workspace_id: str
    start_date: date
    end_date: date
    parameters: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


class ReportResponse(BaseModel):
    """Report response."""

    id: str
    workspace_id: str
    name: str
    report_type: str
    status: str
    parameters: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    start_date: date
    end_date: date
    created_by: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """List of reports response."""

    reports: List[ReportResponse]
    total: int
    page: int
    page_size: int


class ReportSummary(BaseModel):
    """Summary of a report for listing."""

    id: str
    name: str
    report_type: str
    status: str
    start_date: date
    end_date: date
    created_at: datetime
    completed_at: Optional[datetime] = None
