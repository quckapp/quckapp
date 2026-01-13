"""Integrations API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.integration_service import IntegrationService
from app.schemas.integration import (
    IntegrationCreate,
    IntegrationResponse,
    IntegrationListResponse,
    IntegrationTypeInfo,
)

router = APIRouter()


def get_integration_service(db: AsyncSession = Depends(get_db)) -> IntegrationService:
    """Dependency for integration service."""
    return IntegrationService(db)


@router.get("/types")
async def list_integration_types(
    service: IntegrationService = Depends(get_integration_service),
):
    """List available integration types."""
    return {"types": service.get_available_types()}


@router.get("/types/{integration_type}", response_model=IntegrationTypeInfo)
async def get_integration_type(
    integration_type: str,
    service: IntegrationService = Depends(get_integration_service),
):
    """Get information about a specific integration type."""
    info = service.get_type_info(integration_type)
    if not info:
        raise HTTPException(status_code=404, detail="Integration type not found")
    return info


@router.post("", response_model=IntegrationResponse, status_code=201)
async def create_integration(
    request: IntegrationCreate,
    x_user_id: str = Header(..., description="User ID from auth"),
    service: IntegrationService = Depends(get_integration_service),
):
    """Create a new integration.

    After creating, use the OAuth endpoint to complete authentication.
    """
    integration = await service.create_integration(request, x_user_id)
    return IntegrationResponse.model_validate(integration)


@router.get("", response_model=IntegrationListResponse)
async def list_integrations(
    workspace_id: str = Query(..., description="Workspace ID"),
    user_id: Optional[str] = Query(None, description="Filter by user"),
    integration_type: Optional[str] = Query(None, description="Filter by type"),
    service: IntegrationService = Depends(get_integration_service),
):
    """List integrations for a workspace."""
    return await service.list_integrations(workspace_id, user_id, integration_type)


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str,
    service: IntegrationService = Depends(get_integration_service),
):
    """Get integration details."""
    integration = await service.get_integration(integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return IntegrationResponse.model_validate(integration)


@router.delete("/{integration_id}", status_code=204)
async def delete_integration(
    integration_id: str,
    service: IntegrationService = Depends(get_integration_service),
):
    """Delete an integration."""
    deleted = await service.delete_integration(integration_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Integration not found")
    return None


@router.post("/{integration_id}/sync")
async def sync_integration(
    integration_id: str,
    service: IntegrationService = Depends(get_integration_service),
):
    """Trigger sync for an integration."""
    integration = await service.get_integration(integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    if integration.status.value != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Integration is not active. Status: {integration.status.value}",
        )

    result = await service.sync_integration(integration)
    return result
