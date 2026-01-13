from sqlalchemy import Column, String, Text, Boolean, Float, DateTime, Enum, JSON
from sqlalchemy.dialects.mysql import CHAR
from datetime import datetime
import uuid
import enum

from app.db.database import Base

class ModerationAction(str, enum.Enum):
    ALLOW = "allow"
    FLAG = "flag"
    BLOCK = "block"
    DELETE = "delete"

class ContentType(str, enum.Enum):
    MESSAGE = "message"
    FILE = "file"
    PROFILE = "profile"
    CHANNEL_NAME = "channel_name"
    USERNAME = "username"

class ModerationEvent(Base):
    __tablename__ = "moderation_events"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    content_id = Column(CHAR(36), nullable=False, index=True)
    content_type = Column(Enum(ContentType), nullable=False)
    user_id = Column(CHAR(36), nullable=False, index=True)
    original_content = Column(Text, nullable=False)
    action = Column(Enum(ModerationAction), nullable=False)
    reason = Column(String(255))
    confidence_score = Column(Float)
    matched_rules = Column(JSON)
    reviewed_by = Column(CHAR(36))
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class ModerationRule(Base):
    __tablename__ = "moderation_rules"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(CHAR(36), index=True)  # null = global
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    rule_type = Column(String(50), nullable=False)  # keyword, regex, ml
    pattern = Column(Text)
    action = Column(Enum(ModerationAction), nullable=False)
    severity = Column(String(20), default="medium")
    enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

from sqlalchemy import Integer
