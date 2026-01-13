"""Integration management service."""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.integration import Integration, IntegrationType, IntegrationStatus
from app.schemas.integration import (
    IntegrationCreate,
    IntegrationResponse,
    IntegrationListResponse,
    IntegrationTypeInfo,
)

logger = structlog.get_logger()


# Integration type metadata
INTEGRATION_TYPES = {
    IntegrationType.GITHUB: IntegrationTypeInfo(
        type="github",
        name="GitHub",
        description="Connect GitHub repositories to receive notifications and create issues",
        icon_url="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
        oauth_required=True,
        scopes=["repo", "read:user", "read:org"],
        features=["issues", "pull_requests", "commits", "releases"],
    ),
    IntegrationType.JIRA: IntegrationTypeInfo(
        type="jira",
        name="Jira",
        description="Connect Jira to sync issues and track project progress",
        icon_url="https://wac-cdn.atlassian.com/dam/jcr:fa01756d-6dcc-45d1-83ab-696fbfeb074f/Jira-icon-blue.svg",
        oauth_required=True,
        scopes=["read:jira-work", "write:jira-work", "read:jira-user"],
        features=["issues", "projects", "sprints", "boards"],
    ),
    IntegrationType.GOOGLE_DRIVE: IntegrationTypeInfo(
        type="google_drive",
        name="Google Drive",
        description="Connect Google Drive to share and preview files",
        icon_url="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png",
        oauth_required=True,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
        features=["files", "folders", "sharing"],
    ),
    IntegrationType.GOOGLE_CALENDAR: IntegrationTypeInfo(
        type="google_calendar",
        name="Google Calendar",
        description="Connect Google Calendar to sync events and meetings",
        icon_url="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png",
        oauth_required=True,
        scopes=["https://www.googleapis.com/auth/calendar.readonly"],
        features=["events", "reminders", "scheduling"],
    ),
}


class IntegrationService:
    """Service for managing integrations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_integration(
        self,
        request: IntegrationCreate,
        user_id: str,
    ) -> Integration:
        """Create a new integration."""
        integration = Integration(
            id=str(uuid.uuid4()),
            workspace_id=request.workspace_id,
            user_id=user_id,
            integration_type=IntegrationType(request.integration_type),
            status=IntegrationStatus.PENDING,
            config=request.config,
            auto_sync=request.auto_sync,
        )

        self.db.add(integration)
        await self.db.commit()
        await self.db.refresh(integration)

        logger.info(
            "Integration created",
            integration_id=integration.id,
            type=integration.integration_type.value,
        )

        return integration

    async def get_integration(self, integration_id: str) -> Optional[Integration]:
        """Get an integration by ID."""
        query = select(Integration).where(Integration.id == integration_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_integration_by_type(
        self,
        workspace_id: str,
        user_id: str,
        integration_type: str,
    ) -> Optional[Integration]:
        """Get an integration by type for a user and workspace."""
        query = select(Integration).where(
            and_(
                Integration.workspace_id == workspace_id,
                Integration.user_id == user_id,
                Integration.integration_type == IntegrationType(integration_type),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_integrations(
        self,
        workspace_id: str,
        user_id: Optional[str] = None,
        integration_type: Optional[str] = None,
    ) -> IntegrationListResponse:
        """List integrations for a workspace."""
        conditions = [Integration.workspace_id == workspace_id]

        if user_id:
            conditions.append(Integration.user_id == user_id)
        if integration_type:
            conditions.append(
                Integration.integration_type == IntegrationType(integration_type)
            )

        query = (
            select(Integration)
            .where(and_(*conditions))
            .order_by(desc(Integration.created_at))
        )
        result = await self.db.execute(query)
        integrations = result.scalars().all()

        return IntegrationListResponse(
            integrations=[IntegrationResponse.model_validate(i) for i in integrations],
            total=len(integrations),
        )

    async def update_integration_tokens(
        self,
        integration: Integration,
        access_token: str,
        refresh_token: Optional[str],
        expires_at: Optional[datetime],
        external_info: Optional[dict] = None,
    ) -> Integration:
        """Update integration OAuth tokens."""
        integration.access_token = access_token
        integration.refresh_token = refresh_token
        integration.token_expires_at = expires_at
        integration.status = IntegrationStatus.ACTIVE
        integration.error_message = None

        if external_info:
            integration.external_id = external_info.get("id")
            integration.external_name = external_info.get("name")
            integration.external_email = external_info.get("email")
            integration.external_url = external_info.get("url")

        await self.db.commit()
        await self.db.refresh(integration)

        logger.info(
            "Integration tokens updated",
            integration_id=integration.id,
        )

        return integration

    async def update_integration_status(
        self,
        integration: Integration,
        status: IntegrationStatus,
        error_message: Optional[str] = None,
    ) -> Integration:
        """Update integration status."""
        integration.status = status
        integration.error_message = error_message

        await self.db.commit()
        await self.db.refresh(integration)

        return integration

    async def delete_integration(self, integration_id: str) -> bool:
        """Delete an integration."""
        integration = await self.get_integration(integration_id)
        if not integration:
            return False

        await self.db.delete(integration)
        await self.db.commit()

        logger.info("Integration deleted", integration_id=integration_id)
        return True

    async def sync_integration(self, integration: Integration) -> dict:
        """Trigger sync for an integration."""
        # In production, this would trigger background sync jobs
        integration.last_sync_at = datetime.utcnow()
        await self.db.commit()

        return {
            "integration_id": integration.id,
            "status": "sync_triggered",
            "last_sync_at": integration.last_sync_at.isoformat(),
        }

    def get_available_types(self) -> List[IntegrationTypeInfo]:
        """Get list of available integration types."""
        return list(INTEGRATION_TYPES.values())

    def get_type_info(self, integration_type: str) -> Optional[IntegrationTypeInfo]:
        """Get info for a specific integration type."""
        try:
            return INTEGRATION_TYPES.get(IntegrationType(integration_type))
        except ValueError:
            return None
