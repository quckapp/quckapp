import re
from typing import List, Optional
from better_profanity import profanity
import structlog
from sqlalchemy.orm import Session

from app.models.moderation import ModerationEvent, ModerationRule, ModerationAction, ContentType
from app.schemas.moderation import ModerateContentRequest, ModerationResult
from app.services.ml_service import MLModerationService

logger = structlog.get_logger()

class ModerationService:
    def __init__(self, db: Session):
        self.db = db
        self.ml_service = MLModerationService()
        profanity.load_censor_words()

    async def moderate_content(self, request: ModerateContentRequest) -> ModerationResult:
        """Main moderation pipeline"""
        matched_rules = []
        categories = []
        max_confidence = 0.0
        action = ModerationAction.ALLOW
        reason = None

        # 1. Check keyword/regex rules
        rules = self._get_applicable_rules(request.workspace_id)
        for rule in rules:
            if self._matches_rule(request.content, rule):
                matched_rules.append(rule.name)
                if self._is_higher_priority_action(rule.action, action):
                    action = rule.action
                    reason = f"Matched rule: {rule.name}"

        # 2. Check profanity
        if profanity.contains_profanity(request.content):
            categories.append("profanity")
            if action == ModerationAction.ALLOW:
                action = ModerationAction.FLAG
                reason = "Contains profanity"

        # 3. ML-based toxicity detection
        ml_result = await self.ml_service.analyze(request.content)
        if ml_result:
            max_confidence = ml_result.get("score", 0)
            if ml_result.get("is_toxic", False):
                categories.append("toxic")
                if self._is_higher_priority_action(ModerationAction.BLOCK, action):
                    action = ModerationAction.BLOCK
                    reason = f"ML detected toxic content (score: {max_confidence:.2f})"

        # 4. Store moderation event
        event = ModerationEvent(
            workspace_id=request.workspace_id,
            content_id=request.content_id,
            content_type=ContentType(request.content_type),
            user_id=request.user_id,
            original_content=request.content[:1000],  # Truncate for storage
            action=action,
            reason=reason,
            confidence_score=max_confidence,
            matched_rules=matched_rules if matched_rules else None,
        )
        self.db.add(event)
        self.db.commit()

        logger.info(
            "Content moderated",
            content_id=request.content_id,
            action=action.value,
            confidence=max_confidence,
        )

        return ModerationResult(
            content_id=request.content_id,
            action=action,
            reason=reason,
            confidence_score=max_confidence,
            matched_rules=matched_rules,
            categories=categories,
            is_safe=action == ModerationAction.ALLOW,
        )

    def _get_applicable_rules(self, workspace_id: str) -> List[ModerationRule]:
        """Get rules for workspace + global rules"""
        return self.db.query(ModerationRule).filter(
            ModerationRule.enabled == True,
            (ModerationRule.workspace_id == workspace_id) | (ModerationRule.workspace_id == None)
        ).order_by(ModerationRule.priority.desc()).all()

    def _matches_rule(self, content: str, rule: ModerationRule) -> bool:
        """Check if content matches a rule"""
        if not rule.pattern:
            return False

        content_lower = content.lower()

        if rule.rule_type == "keyword":
            keywords = [k.strip().lower() for k in rule.pattern.split(",")]
            return any(kw in content_lower for kw in keywords)

        elif rule.rule_type == "regex":
            try:
                return bool(re.search(rule.pattern, content, re.IGNORECASE))
            except re.error:
                logger.warning("Invalid regex pattern", rule_id=rule.id)
                return False

        return False

    def _is_higher_priority_action(self, new_action: ModerationAction, current_action: ModerationAction) -> bool:
        """Compare action priorities"""
        priority = {
            ModerationAction.ALLOW: 0,
            ModerationAction.FLAG: 1,
            ModerationAction.BLOCK: 2,
            ModerationAction.DELETE: 3,
        }
        return priority.get(new_action, 0) > priority.get(current_action, 0)

    def get_events(
        self,
        workspace_id: str,
        limit: int = 50,
        offset: int = 0,
        action_filter: Optional[ModerationAction] = None,
    ) -> List[ModerationEvent]:
        """Get moderation events for a workspace"""
        query = self.db.query(ModerationEvent).filter(
            ModerationEvent.workspace_id == workspace_id
        )

        if action_filter:
            query = query.filter(ModerationEvent.action == action_filter)

        return query.order_by(ModerationEvent.created_at.desc()).offset(offset).limit(limit).all()
