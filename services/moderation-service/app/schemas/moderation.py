from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ModerationAction(str, Enum):
    ALLOW = "allow"
    FLAG = "flag"
    BLOCK = "block"
    DELETE = "delete"

class ContentType(str, Enum):
    MESSAGE = "message"
    FILE = "file"
    PROFILE = "profile"
    CHANNEL_NAME = "channel_name"
    USERNAME = "username"

class ModerateContentRequest(BaseModel):
    workspace_id: str
    content_id: str
    content_type: ContentType
    user_id: str
    content: str
    metadata: Optional[dict] = None

class ModerationResult(BaseModel):
    content_id: str
    action: ModerationAction
    reason: Optional[str] = None
    confidence_score: float
    matched_rules: List[str] = []
    categories: List[str] = []
    is_safe: bool

class ModerationEventResponse(BaseModel):
    id: str
    workspace_id: str
    content_id: str
    content_type: ContentType
    user_id: str
    action: ModerationAction
    reason: Optional[str]
    confidence_score: Optional[float]
    matched_rules: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True

class CreateRuleRequest(BaseModel):
    workspace_id: Optional[str] = None
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    rule_type: str = Field(..., pattern="^(keyword|regex|ml)$")
    pattern: Optional[str] = None
    action: ModerationAction
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    priority: int = Field(default=0, ge=0, le=100)

class UpdateRuleRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    pattern: Optional[str] = None
    action: Optional[ModerationAction] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = None

class RuleResponse(BaseModel):
    id: str
    workspace_id: Optional[str]
    name: str
    description: Optional[str]
    rule_type: str
    pattern: Optional[str]
    action: ModerationAction
    severity: str
    enabled: bool
    priority: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BulkModerateRequest(BaseModel):
    items: List[ModerateContentRequest]

class BulkModerationResult(BaseModel):
    results: List[ModerationResult]
    total: int
    blocked: int
    flagged: int
    allowed: int
