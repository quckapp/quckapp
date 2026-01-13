"""OAuth API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.services.integration_service import IntegrationService
from app.services.oauth_service import oauth_service
from app.schemas.integration import OAuthInitResponse

router = APIRouter()


def get_integration_service(db: AsyncSession = Depends(get_db)) -> IntegrationService:
    """Dependency for integration service."""
    return IntegrationService(db)


@router.get("/{integration_type}/authorize", response_model=OAuthInitResponse)
async def initiate_oauth(
    integration_type: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    x_user_id: str = Header(..., description="User ID from auth"),
):
    """Initiate OAuth flow for an integration.

    Returns an authorization URL that the user should be redirected to.
    """
    try:
        state = oauth_service.generate_state(integration_type, workspace_id, x_user_id)
        auth_url = oauth_service.get_authorization_url(integration_type, state)

        return OAuthInitResponse(
            authorization_url=auth_url,
            state=state,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    service: IntegrationService = Depends(get_integration_service),
):
    """Handle GitHub OAuth callback."""
    return await _handle_oauth_callback("github", code, state, service)


@router.get("/jira/callback")
async def jira_callback(
    code: str = Query(...),
    state: str = Query(...),
    service: IntegrationService = Depends(get_integration_service),
):
    """Handle Jira OAuth callback."""
    return await _handle_oauth_callback("jira", code, state, service)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    service: IntegrationService = Depends(get_integration_service),
):
    """Handle Google OAuth callback."""
    # Determine integration type from state
    state_data = oauth_service.validate_state(state)
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    integration_type = state_data["integration_type"]
    return await _handle_oauth_callback(
        integration_type, code, state, service, state_data
    )


async def _handle_oauth_callback(
    integration_type: str,
    code: str,
    state: str,
    service: IntegrationService,
    state_data: dict = None,
):
    """Handle OAuth callback for any provider."""
    # Validate state if not already validated
    if state_data is None:
        state_data = oauth_service.validate_state(state)
        if not state_data:
            raise HTTPException(status_code=400, detail="Invalid or expired state")

    workspace_id = state_data["workspace_id"]
    user_id = state_data["user_id"]

    try:
        # Exchange code for tokens
        access_token, refresh_token, expires_at, user_info = await oauth_service.exchange_code(
            integration_type, code
        )

        # Get or create integration
        integration = await service.get_integration_by_type(
            workspace_id, user_id, integration_type
        )

        if not integration:
            # Create new integration
            from app.schemas.integration import IntegrationCreate

            integration = await service.create_integration(
                IntegrationCreate(
                    integration_type=integration_type,
                    workspace_id=workspace_id,
                ),
                user_id,
            )

        # Update with tokens
        await service.update_integration_tokens(
            integration,
            access_token,
            refresh_token,
            expires_at,
            user_info,
        )

        # Return success response or redirect
        return {
            "status": "success",
            "message": f"{integration_type.title()} integration connected successfully",
            "integration_id": integration.id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth authentication failed: {str(e)}",
        )


@router.post("/{integration_id}/refresh")
async def refresh_token(
    integration_id: str,
    service: IntegrationService = Depends(get_integration_service),
):
    """Refresh OAuth tokens for an integration."""
    integration = await service.get_integration(integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    if not integration.refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token available for this integration",
        )

    # In production, implement token refresh logic
    return {
        "status": "refresh_not_implemented",
        "integration_id": integration_id,
    }


@router.post("/{integration_id}/revoke")
async def revoke_token(
    integration_id: str,
    service: IntegrationService = Depends(get_integration_service),
):
    """Revoke OAuth tokens for an integration."""
    integration = await service.get_integration(integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    # In production, call provider's revoke endpoint
    from app.models.integration import IntegrationStatus

    await service.update_integration_status(integration, IntegrationStatus.REVOKED)

    return {
        "status": "success",
        "message": "Integration tokens revoked",
        "integration_id": integration_id,
    }
