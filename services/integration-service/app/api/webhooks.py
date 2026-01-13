"""Webhook API endpoints."""

import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.core.database import get_db
from app.schemas.webhook import GitHubWebhookPayload, JiraWebhookPayload

router = APIRouter()
logger = structlog.get_logger()


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook signature."""
    if not signature or not secret:
        return False

    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def verify_jira_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Jira webhook signature (if configured)."""
    # Jira webhook verification logic
    return True  # Simplified for this example


@router.post("/github")
async def handle_github_webhook(
    request: Request,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_hub_signature: str = Header(None, alias="X-Hub-Signature-256"),
):
    """Handle incoming GitHub webhooks."""
    body = await request.body()

    # Verify signature if secret is configured
    if settings.GITHUB_WEBHOOK_SECRET:
        if not verify_github_signature(body, x_hub_signature, settings.GITHUB_WEBHOOK_SECRET):
            raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()

    logger.info(
        "GitHub webhook received",
        event=x_github_event,
        action=payload.get("action"),
    )

    # Process webhook based on event type
    result = await _process_github_event(x_github_event, payload)

    return {"status": "processed", "event": x_github_event, "result": result}


@router.post("/jira")
async def handle_jira_webhook(
    request: Request,
    x_atlassian_webhook_identifier: str = Header(None),
):
    """Handle incoming Jira webhooks."""
    body = await request.body()
    payload = await request.json()

    webhook_event = payload.get("webhookEvent", "unknown")

    logger.info(
        "Jira webhook received",
        event=webhook_event,
        issue=payload.get("issue", {}).get("key"),
    )

    # Process webhook based on event type
    result = await _process_jira_event(webhook_event, payload)

    return {"status": "processed", "event": webhook_event, "result": result}


async def _process_github_event(event_type: str, payload: dict) -> dict:
    """Process GitHub webhook event."""
    handlers = {
        "push": _handle_github_push,
        "pull_request": _handle_github_pr,
        "issues": _handle_github_issue,
        "issue_comment": _handle_github_comment,
        "release": _handle_github_release,
    }

    handler = handlers.get(event_type, _handle_github_default)
    return await handler(payload)


async def _handle_github_push(payload: dict) -> dict:
    """Handle GitHub push event."""
    return {
        "type": "push",
        "ref": payload.get("ref"),
        "commits": len(payload.get("commits", [])),
        "repository": payload.get("repository", {}).get("full_name"),
    }


async def _handle_github_pr(payload: dict) -> dict:
    """Handle GitHub pull request event."""
    pr = payload.get("pull_request", {})
    return {
        "type": "pull_request",
        "action": payload.get("action"),
        "number": pr.get("number"),
        "title": pr.get("title"),
        "state": pr.get("state"),
    }


async def _handle_github_issue(payload: dict) -> dict:
    """Handle GitHub issue event."""
    issue = payload.get("issue", {})
    return {
        "type": "issue",
        "action": payload.get("action"),
        "number": issue.get("number"),
        "title": issue.get("title"),
        "state": issue.get("state"),
    }


async def _handle_github_comment(payload: dict) -> dict:
    """Handle GitHub comment event."""
    comment = payload.get("comment", {})
    return {
        "type": "comment",
        "action": payload.get("action"),
        "comment_id": comment.get("id"),
        "issue_number": payload.get("issue", {}).get("number"),
    }


async def _handle_github_release(payload: dict) -> dict:
    """Handle GitHub release event."""
    release = payload.get("release", {})
    return {
        "type": "release",
        "action": payload.get("action"),
        "tag_name": release.get("tag_name"),
        "name": release.get("name"),
    }


async def _handle_github_default(payload: dict) -> dict:
    """Handle unknown GitHub event."""
    return {"type": "unknown", "processed": False}


async def _process_jira_event(event_type: str, payload: dict) -> dict:
    """Process Jira webhook event."""
    issue = payload.get("issue", {})

    if "issue_created" in event_type:
        return {
            "type": "issue_created",
            "key": issue.get("key"),
            "summary": issue.get("fields", {}).get("summary"),
        }
    elif "issue_updated" in event_type:
        return {
            "type": "issue_updated",
            "key": issue.get("key"),
            "changelog": payload.get("changelog"),
        }
    elif "comment" in event_type:
        return {
            "type": "comment",
            "issue_key": issue.get("key"),
            "comment": payload.get("comment", {}).get("body"),
        }
    else:
        return {"type": event_type, "processed": False}
