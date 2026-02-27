"""Pydantic request/response schemas for the promotion-gate endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class CanPromoteResponse(BaseModel):
    """Returned by GET /can-promote."""

    allowed: bool
    service_key: str = Field(alias="serviceKey")
    api_version: str = Field(alias="apiVersion")
    from_environment: str = Field(alias="fromEnvironment")
    to_environment: str = Field(alias="toEnvironment")
    blocked_reason: Optional[str] = Field(None, alias="blockedReason")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class PromoteRequest(BaseModel):
    """JSON body for POST /promote."""

    service_key: str = Field(alias="serviceKey")
    api_version: str = Field(alias="apiVersion")
    from_environment: str = Field(alias="fromEnvironment")
    to_environment: str = Field(alias="toEnvironment")
    promoted_by: str = Field(alias="promotedBy")
    reason: Optional[str] = None

    model_config = {"populate_by_name": True}


class EmergencyActivateRequest(BaseModel):
    """JSON body for POST /emergency-activate.

    Requires dual approval: two different approvers plus a JIRA ticket.
    """

    service_key: str = Field(alias="serviceKey")
    api_version: str = Field(alias="apiVersion")
    to_environment: str = Field(alias="toEnvironment")
    promoted_by: str = Field(alias="promotedBy")
    approved_by: str = Field(alias="approvedBy")
    reason: str
    jira_ticket: str = Field(alias="jiraTicket")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# History / record response
# ---------------------------------------------------------------------------

class PromotionRecordResponse(BaseModel):
    """Serialised form of a single promotion record returned by the API."""

    id: str
    service_key: str = Field(alias="serviceKey")
    api_version: str = Field(alias="apiVersion")
    from_environment: str = Field(alias="fromEnvironment")
    to_environment: str = Field(alias="toEnvironment")
    status: str
    promoted_by: str = Field(alias="promotedBy")
    approved_by: Optional[str] = Field(None, alias="approvedBy")
    reason: Optional[str] = None
    is_emergency: bool = Field(False, alias="isEmergency")
    jira_ticket: Optional[str] = Field(None, alias="jiraTicket")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}
