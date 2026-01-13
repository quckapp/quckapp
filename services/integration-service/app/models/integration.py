"""Integration model."""

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Enum, JSON, Boolean
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class IntegrationType(str, PyEnum):
    """Integration type enumeration."""

    GITHUB = "github"
    JIRA = "jira"
    CONFLUENCE = "confluence"
    GOOGLE_DRIVE = "google_drive"
    GOOGLE_CALENDAR = "google_calendar"
    SLACK = "slack"
    TRELLO = "trello"
    NOTION = "notion"
    LINEAR = "linear"


class IntegrationStatus(str, PyEnum):
    """Integration status enumeration."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"
    REVOKED = "revoked"


class Integration(Base):
    """Integration entity."""

    __tablename__ = "integrations"

    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)
    user_id = Column(CHAR(36), nullable=False, index=True)
    integration_type = Column(Enum(IntegrationType), nullable=False)
    status = Column(
        Enum(IntegrationStatus),
        nullable=False,
        default=IntegrationStatus.PENDING,
    )

    # OAuth tokens (encrypted)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    # Integration configuration
    config = Column(JSON, nullable=True)

    # External account info
    external_id = Column(String(255), nullable=True)
    external_name = Column(String(255), nullable=True)
    external_email = Column(String(255), nullable=True)
    external_url = Column(Text, nullable=True)

    # Permissions/scopes
    scopes = Column(JSON, nullable=True)

    # Flags
    is_enabled = Column(Boolean, nullable=False, default=True)
    auto_sync = Column(Boolean, nullable=False, default=False)

    # Metadata
    last_sync_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Integration(id={self.id}, type={self.integration_type}, status={self.status})>"
