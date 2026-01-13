"""User insights service."""

import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_activity import UserActivity
from app.schemas.user import (
    UserActivityResponse,
    UserEngagementResponse,
    TopUsersResponse,
    TopUserItem,
)
from app.schemas.common import TimeSeriesPoint
from app.core.cache import cache
from app.core.config import settings


class UserInsightsService:
    """Service for user insights and analytics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_activity(
        self,
        user_id: str,
        workspace_id: str,
        activity_date: date,
    ) -> Optional[UserActivityResponse]:
        """Get user activity for a specific date."""
        query = select(UserActivity).where(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.workspace_id == workspace_id,
                UserActivity.activity_date == activity_date,
            )
        )
        result = await self.db.execute(query)
        activity = result.scalar_one_or_none()

        if not activity:
            return None

        return UserActivityResponse.model_validate(activity)

    async def get_user_engagement(
        self,
        user_id: str,
        workspace_id: str,
        start_date: date,
        end_date: date,
    ) -> UserEngagementResponse:
        """Get user engagement analysis over a date range."""
        cache_key = f"user:engagement:{user_id}:{workspace_id}:{start_date}:{end_date}"
        cached = await cache.get(cache_key)
        if cached:
            return UserEngagementResponse(**cached)

        # Get activity records
        query = (
            select(UserActivity)
            .where(
                and_(
                    UserActivity.user_id == user_id,
                    UserActivity.workspace_id == workspace_id,
                    UserActivity.activity_date >= start_date,
                    UserActivity.activity_date <= end_date,
                )
            )
            .order_by(UserActivity.activity_date)
        )
        result = await self.db.execute(query)
        activities = result.scalars().all()

        # Calculate metrics
        total_active_days = len(activities)
        total_messages = sum(a.messages_sent for a in activities)
        total_reactions = sum(a.reactions_given for a in activities)
        total_active_minutes = sum(a.total_active_minutes for a in activities)

        days_in_period = (end_date - start_date).days + 1
        avg_daily_messages = total_messages / days_in_period if days_in_period > 0 else 0
        avg_session_duration = (
            total_active_minutes / total_active_days if total_active_days > 0 else 0
        )

        # Calculate engagement score (0-100)
        engagement_score = self._calculate_engagement_score(
            total_active_days,
            days_in_period,
            total_messages,
            total_reactions,
            avg_session_duration,
        )

        engagement_level = self._get_engagement_level(engagement_score)

        # Build time series
        daily_activity = [
            TimeSeriesPoint(
                timestamp=datetime.combine(a.activity_date, datetime.min.time()),
                value=float(a.total_active_minutes),
            )
            for a in activities
        ]

        message_trend = [
            TimeSeriesPoint(
                timestamp=datetime.combine(a.activity_date, datetime.min.time()),
                value=float(a.messages_sent),
            )
            for a in activities
        ]

        response = UserEngagementResponse(
            user_id=user_id,
            workspace_id=workspace_id,
            period_start=start_date,
            period_end=end_date,
            total_active_days=total_active_days,
            total_messages=total_messages,
            total_reactions=total_reactions,
            avg_daily_messages=avg_daily_messages,
            avg_session_duration_minutes=avg_session_duration,
            engagement_score=engagement_score,
            engagement_level=engagement_level,
            daily_activity=daily_activity,
            message_trend=message_trend,
        )

        await cache.set(cache_key, response.model_dump(), settings.CACHE_TTL_SHORT)
        return response

    def _calculate_engagement_score(
        self,
        active_days: int,
        total_days: int,
        messages: int,
        reactions: int,
        avg_session_minutes: float,
    ) -> float:
        """Calculate engagement score from 0-100."""
        if total_days == 0:
            return 0.0

        # Activity rate (0-40 points)
        activity_rate = (active_days / total_days) * 40

        # Message activity (0-30 points)
        # Assume 10 messages/day is high engagement
        daily_msg_rate = messages / total_days
        message_score = min(30, (daily_msg_rate / 10) * 30)

        # Reaction activity (0-15 points)
        daily_reaction_rate = reactions / total_days
        reaction_score = min(15, (daily_reaction_rate / 5) * 15)

        # Session duration (0-15 points)
        # Assume 60 minutes/day is high engagement
        session_score = min(15, (avg_session_minutes / 60) * 15)

        total_score = activity_rate + message_score + reaction_score + session_score
        return round(total_score, 1)

    def _get_engagement_level(self, score: float) -> str:
        """Get engagement level from score."""
        if score >= 70:
            return "high"
        elif score >= 40:
            return "medium"
        elif score >= 10:
            return "low"
        return "inactive"

    async def get_top_users(
        self,
        workspace_id: str,
        start_date: date,
        end_date: date,
        metric_type: str = "messages",
        limit: int = 10,
    ) -> TopUsersResponse:
        """Get top users by specified metric."""
        cache_key = f"top_users:{workspace_id}:{start_date}:{end_date}:{metric_type}"
        cached = await cache.get(cache_key)
        if cached:
            return TopUsersResponse(**cached)

        # Determine which column to aggregate
        metric_column = self._get_metric_column(metric_type)
        metric_label = self._get_metric_label(metric_type)

        query = (
            select(
                UserActivity.user_id,
                func.sum(metric_column).label("metric_value"),
            )
            .where(
                and_(
                    UserActivity.workspace_id == workspace_id,
                    UserActivity.activity_date >= start_date,
                    UserActivity.activity_date <= end_date,
                )
            )
            .group_by(UserActivity.user_id)
            .order_by(func.sum(metric_column).desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        users = result.all()

        # Get total users count
        count_query = (
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(
                and_(
                    UserActivity.workspace_id == workspace_id,
                    UserActivity.activity_date >= start_date,
                    UserActivity.activity_date <= end_date,
                )
            )
        )
        count_result = await self.db.execute(count_query)
        total_users = count_result.scalar() or 0

        # Build response
        top_users = [
            TopUserItem(
                rank=idx + 1,
                user_id=row.user_id,
                metric_value=float(row.metric_value or 0),
                metric_label=metric_label,
                badges=self._get_badges(idx + 1, row.metric_value),
            )
            for idx, row in enumerate(users)
        ]

        response = TopUsersResponse(
            workspace_id=workspace_id,
            period_start=start_date,
            period_end=end_date,
            metric_type=metric_type,
            users=top_users,
            total_users_analyzed=total_users,
        )

        await cache.set(cache_key, response.model_dump(), settings.CACHE_TTL_MEDIUM)
        return response

    def _get_metric_column(self, metric_type: str):
        """Get the SQLAlchemy column for the metric type."""
        columns = {
            "messages": UserActivity.messages_sent,
            "reactions": UserActivity.reactions_given,
            "active_time": UserActivity.total_active_minutes,
            "files": UserActivity.files_uploaded,
        }
        return columns.get(metric_type, UserActivity.messages_sent)

    def _get_metric_label(self, metric_type: str) -> str:
        """Get human-readable label for metric type."""
        labels = {
            "messages": "messages sent",
            "reactions": "reactions given",
            "active_time": "active minutes",
            "files": "files uploaded",
        }
        return labels.get(metric_type, "messages")

    def _get_badges(self, rank: int, value: float) -> List[str]:
        """Determine badges based on rank and value."""
        badges = []
        if rank == 1:
            badges.append("top_contributor")
        elif rank <= 3:
            badges.append("high_performer")
        return badges

    async def record_user_activity(
        self,
        user_id: str,
        workspace_id: str,
        activity_date: date,
        activity_data: dict,
    ) -> UserActivity:
        """Record or update user activity for a date."""
        query = select(UserActivity).where(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.workspace_id == workspace_id,
                UserActivity.activity_date == activity_date,
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            for key, value in activity_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
        else:
            existing = UserActivity(
                id=str(uuid.uuid4()),
                user_id=user_id,
                workspace_id=workspace_id,
                activity_date=activity_date,
                **activity_data,
            )
            self.db.add(existing)

        await self.db.commit()
        await self.db.refresh(existing)

        # Invalidate cache
        await cache.delete_pattern(f"user:*:{user_id}:*")

        return existing
