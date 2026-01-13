"""Integration schema definitions."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class IntegrationType(str, Enum):
    """Integration type options."""

    GITHUB = "github"
    JIRA = "jira"
    CONFLUENCE = "confluence"
    GOOGLE_DRIVE = "google_drive"
    GOOGLE_CALENDAR = "google_calendar"
    SLACK = "slack"
    TRELLO = "trello"
    NOTION = "notion"
    LINEAR = "linear"


class IntegrationStatus(str, Enum):
    """Integration status options."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"
    REVOKED = "revoked"


class IntegrationCreate(BaseModel):
    """Request to create an integration."""

    integration_type: IntegrationType
    workspace_id: str
    config: Optional[Dict[str, Any]] = None
    auto_sync: bool = False

    class Config:
        use_enum_values = True


class IntegrationResponse(BaseModel):
    """Integration details response."""

    id: str
    workspace_id: str
    user_id: str
    integration_type: str
    status: str
    config: Optional[Dict[str, Any]] = None
    external_id: Optional[str] = None
    external_name: Optional[str] = None
    external_email: Optional[str] = None
    external_url: Optional[str] = None
    scopes: Optional[List[str]] = None
    is_enabled: bool
    auto_sync: bool
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IntegrationListResponse(BaseModel):
    """List of integrations response."""

    integrations: List[IntegrationResponse]
    total: int


class IntegrationTypeInfo(BaseModel):
    """Information about an integration type."""

    type: str
    name: str
    description: str
    icon_url: Optional[str] = None
    oauth_required: bool = True
    scopes: List[str] = []
    features: List[str] = []


class OAuthInitResponse(BaseModel):
    """OAuth initialization response."""

    authorization_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request."""

    code: str
    state: str


class SyncRequest(BaseModel):
    """Request to sync an integration."""

    full_sync: bool = False
    entity_types: Optional[List[str]] = None  # e.g., ["issues", "repositories"]
