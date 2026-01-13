from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.moderation import ModerationRule
from app.schemas.moderation import (
    CreateRuleRequest,
    UpdateRuleRequest,
    RuleResponse,
)

router = APIRouter()

@router.post("", response_model=RuleResponse, status_code=201)
async def create_rule(
    request: CreateRuleRequest,
    db: Session = Depends(get_db),
):
    """Create a new moderation rule"""
    rule = ModerationRule(
        workspace_id=request.workspace_id,
        name=request.name,
        description=request.description,
        rule_type=request.rule_type,
        pattern=request.pattern,
        action=request.action,
        severity=request.severity,
        priority=request.priority,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.get("", response_model=List[RuleResponse])
async def get_rules(
    workspace_id: Optional[str] = None,
    include_global: bool = True,
    db: Session = Depends(get_db),
):
    """Get moderation rules"""
    query = db.query(ModerationRule)

    if workspace_id:
        if include_global:
            query = query.filter(
                (ModerationRule.workspace_id == workspace_id) |
                (ModerationRule.workspace_id == None)
            )
        else:
            query = query.filter(ModerationRule.workspace_id == workspace_id)

    return query.order_by(ModerationRule.priority.desc()).all()

@router.get("/{rule_id}", response_model=RuleResponse)
async def get_rule(rule_id: str, db: Session = Depends(get_db)):
    """Get a specific moderation rule"""
    rule = db.query(ModerationRule).filter(ModerationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: str,
    request: UpdateRuleRequest,
    db: Session = Depends(get_db),
):
    """Update a moderation rule"""
    rule = db.query(ModerationRule).filter(ModerationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)

    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    """Delete a moderation rule"""
    rule = db.query(ModerationRule).filter(ModerationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}

@router.post("/{rule_id}/toggle")
async def toggle_rule(rule_id: str, db: Session = Depends(get_db)):
    """Toggle a rule's enabled status"""
    rule = db.query(ModerationRule).filter(ModerationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.enabled = not rule.enabled
    db.commit()

    return {"message": f"Rule {'enabled' if rule.enabled else 'disabled'}", "enabled": rule.enabled}
