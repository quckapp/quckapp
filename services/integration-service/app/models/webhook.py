"""Webhook model."""

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Enum, JSON, Integer, ForeignKey
from sqlalchemy.dialects.mysql import CHAR

from app.core.database import Base


class WebhookStatus(str, PyEnum):
    """Webhook status enumeration."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"


class IntegrationWebhook(Base):
    """Integration webhook entity."""

    __tablename__ = "integration_webhooks"

    id = Column(CHAR(36), primary_key=True)
    integration_id = Column(CHAR(36), ForeignKey("integrations.id"), nullable=False, index=True)
    workspace_id = Column(CHAR(36), nullable=False, index=True)

    # Webhook configuration
    webhook_url = Column(Text, nullable=False)
    secret = Column(String(255), nullable=True)
    events = Column(JSON, nullable=True)  # List of subscribed events

    # Status
    status = Column(
        Enum(WebhookStatus),
        nullable=False,
        default=WebhookStatus.ACTIVE,
    )

    # Stats
    deliveries_count = Column(Integer, nullable=False, default=0)
    failures_count = Column(Integer, nullable=False, default=0)
    last_delivery_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<IntegrationWebhook(id={self.id}, integration_id={self.integration_id})>"
