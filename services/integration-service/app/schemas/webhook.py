"""Webhook schema definitions."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WebhookCreate(BaseModel):
    """Request to create a webhook."""

    integration_id: str
    events: List[str] = Field(..., min_length=1)


class WebhookResponse(BaseModel):
    """Webhook details response."""

    id: str
    integration_id: str
    workspace_id: str
    webhook_url: str
    events: Optional[List[str]] = None
    status: str
    deliveries_count: int
    failures_count: int
    last_delivery_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookEvent(BaseModel):
    """Incoming webhook event."""

    event_type: str
    payload: Dict[str, Any]
    source: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WebhookDelivery(BaseModel):
    """Webhook delivery record."""

    id: str
    webhook_id: str
    event_type: str
    payload: Dict[str, Any]
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    delivered_at: datetime
    success: bool


class GitHubWebhookPayload(BaseModel):
    """GitHub webhook payload."""

    action: Optional[str] = None
    repository: Optional[Dict[str, Any]] = None
    sender: Optional[Dict[str, Any]] = None
    issue: Optional[Dict[str, Any]] = None
    pull_request: Optional[Dict[str, Any]] = None
    comment: Optional[Dict[str, Any]] = None


class JiraWebhookPayload(BaseModel):
    """Jira webhook payload."""

    webhookEvent: str
    issue: Optional[Dict[str, Any]] = None
    user: Optional[Dict[str, Any]] = None
    changelog: Optional[Dict[str, Any]] = None
    comment: Optional[Dict[str, Any]] = None
