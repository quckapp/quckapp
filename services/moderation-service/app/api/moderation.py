from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.schemas.moderation import (
    ModerateContentRequest,
    ModerationResult,
    ModerationEventResponse,
    BulkModerateRequest,
    BulkModerationResult,
    ModerationAction,
)
from app.services.moderation_service import ModerationService

router = APIRouter()

@router.post("/check", response_model=ModerationResult)
async def moderate_content(
    request: ModerateContentRequest,
    db: Session = Depends(get_db),
):
    """Check content for moderation violations"""
    service = ModerationService(db)
    return await service.moderate_content(request)

@router.post("/check/bulk", response_model=BulkModerationResult)
async def moderate_content_bulk(
    request: BulkModerateRequest,
    db: Session = Depends(get_db),
):
    """Check multiple content items for moderation violations"""
    service = ModerationService(db)
    results = []
    blocked = 0
    flagged = 0
    allowed = 0

    for item in request.items:
        result = await service.moderate_content(item)
        results.append(result)

        if result.action == ModerationAction.BLOCK:
            blocked += 1
        elif result.action == ModerationAction.FLAG:
            flagged += 1
        else:
            allowed += 1

    return BulkModerationResult(
        results=results,
        total=len(results),
        blocked=blocked,
        flagged=flagged,
        allowed=allowed,
    )

@router.get("/events/{workspace_id}", response_model=List[ModerationEventResponse])
async def get_moderation_events(
    workspace_id: str,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    action: Optional[ModerationAction] = None,
    db: Session = Depends(get_db),
):
    """Get moderation events for a workspace"""
    service = ModerationService(db)
    events = service.get_events(workspace_id, limit, offset, action)
    return events

@router.post("/events/{event_id}/review")
async def review_moderation_event(
    event_id: str,
    action: ModerationAction,
    reviewer_id: str,
    db: Session = Depends(get_db),
):
    """Review and update a moderation event"""
    from app.models.moderation import ModerationEvent
    from datetime import datetime

    event = db.query(ModerationEvent).filter(ModerationEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.action = action
    event.reviewed_by = reviewer_id
    event.reviewed_at = datetime.utcnow()
    db.commit()

    return {"message": "Event reviewed", "new_action": action.value}
