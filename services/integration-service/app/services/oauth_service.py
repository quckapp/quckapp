"""OAuth service for third-party authentication."""

import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from urllib.parse import urlencode
import httpx
import structlog

from app.core.config import settings
from app.models.integration import IntegrationType

logger = structlog.get_logger()


class OAuthService:
    """Service for handling OAuth flows."""

    def __init__(self):
        self._states: dict = {}  # In production, use Redis

    def generate_state(self, integration_type: str, workspace_id: str, user_id: str) -> str:
        """Generate OAuth state parameter."""
        state = secrets.token_urlsafe(32)
        self._states[state] = {
            "integration_type": integration_type,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "created_at": datetime.utcnow(),
        }
        return state

    def validate_state(self, state: str) -> Optional[dict]:
        """Validate and consume OAuth state."""
        data = self._states.pop(state, None)
        if not data:
            return None

        # Check expiry (10 minutes)
        if datetime.utcnow() - data["created_at"] > timedelta(minutes=10):
            return None

        return data

    def get_authorization_url(self, integration_type: str, state: str) -> str:
        """Get OAuth authorization URL for an integration type."""
        if integration_type == IntegrationType.GITHUB.value:
            return self._get_github_auth_url(state)
        elif integration_type == IntegrationType.JIRA.value:
            return self._get_jira_auth_url(state)
        elif integration_type in [IntegrationType.GOOGLE_DRIVE.value, IntegrationType.GOOGLE_CALENDAR.value]:
            return self._get_google_auth_url(state, integration_type)
        else:
            raise ValueError(f"Unsupported integration type: {integration_type}")

    def _get_github_auth_url(self, state: str) -> str:
        """Get GitHub OAuth authorization URL."""
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "repo read:user read:org",
            "state": state,
        }
        return f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    def _get_jira_auth_url(self, state: str) -> str:
        """Get Jira OAuth authorization URL."""
        params = {
            "audience": "api.atlassian.com",
            "client_id": settings.JIRA_CLIENT_ID,
            "scope": "read:jira-work write:jira-work read:jira-user offline_access",
            "redirect_uri": settings.JIRA_REDIRECT_URI,
            "state": state,
            "response_type": "code",
            "prompt": "consent",
        }
        return f"https://auth.atlassian.com/authorize?{urlencode(params)}"

    def _get_google_auth_url(self, state: str, integration_type: str) -> str:
        """Get Google OAuth authorization URL."""
        scopes = []
        if integration_type == IntegrationType.GOOGLE_DRIVE.value:
            scopes = ["https://www.googleapis.com/auth/drive.readonly"]
        elif integration_type == IntegrationType.GOOGLE_CALENDAR.value:
            scopes = ["https://www.googleapis.com/auth/calendar.readonly"]

        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "scope": " ".join(scopes),
            "state": state,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    async def exchange_code(
        self,
        integration_type: str,
        code: str,
    ) -> Tuple[str, Optional[str], Optional[datetime], dict]:
        """Exchange authorization code for tokens.

        Returns: (access_token, refresh_token, expires_at, user_info)
        """
        if integration_type == IntegrationType.GITHUB.value:
            return await self._exchange_github_code(code)
        elif integration_type == IntegrationType.JIRA.value:
            return await self._exchange_jira_code(code)
        elif integration_type in [IntegrationType.GOOGLE_DRIVE.value, IntegrationType.GOOGLE_CALENDAR.value]:
            return await self._exchange_google_code(code)
        else:
            raise ValueError(f"Unsupported integration type: {integration_type}")

    async def _exchange_github_code(
        self, code: str
    ) -> Tuple[str, Optional[str], Optional[datetime], dict]:
        """Exchange GitHub authorization code."""
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            token_data = response.json()

            if "error" in token_data:
                raise ValueError(f"GitHub OAuth error: {token_data.get('error_description')}")

            access_token = token_data["access_token"]

            # Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            user_data = user_response.json()

            user_info = {
                "id": str(user_data.get("id")),
                "name": user_data.get("name") or user_data.get("login"),
                "email": user_data.get("email"),
                "url": user_data.get("html_url"),
            }

            return access_token, None, None, user_info

    async def _exchange_jira_code(
        self, code: str
    ) -> Tuple[str, Optional[str], Optional[datetime], dict]:
        """Exchange Jira authorization code."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://auth.atlassian.com/oauth/token",
                json={
                    "grant_type": "authorization_code",
                    "client_id": settings.JIRA_CLIENT_ID,
                    "client_secret": settings.JIRA_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.JIRA_REDIRECT_URI,
                },
            )
            token_data = response.json()

            if "error" in token_data:
                raise ValueError(f"Jira OAuth error: {token_data.get('error_description')}")

            access_token = token_data["access_token"]
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            # Get user info
            user_response = await client.get(
                "https://api.atlassian.com/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_data = user_response.json()

            user_info = {
                "id": user_data.get("account_id"),
                "name": user_data.get("name"),
                "email": user_data.get("email"),
            }

            return access_token, refresh_token, expires_at, user_info

    async def _exchange_google_code(
        self, code: str
    ) -> Tuple[str, Optional[str], Optional[datetime], dict]:
        """Exchange Google authorization code."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                },
            )
            token_data = response.json()

            if "error" in token_data:
                raise ValueError(f"Google OAuth error: {token_data.get('error_description')}")

            access_token = token_data["access_token"]
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            # Get user info
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_data = user_response.json()

            user_info = {
                "id": user_data.get("id"),
                "name": user_data.get("name"),
                "email": user_data.get("email"),
            }

            return access_token, refresh_token, expires_at, user_info


oauth_service = OAuthService()
