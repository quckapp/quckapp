"""Workspace insights service."""

import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace_metrics import WorkspaceMetrics
from app.models.message_stats import MessageStats
from app.models.user_activity import UserActivity
from app.schemas.workspace import (
    WorkspaceMetricsResponse,
    WorkspaceTrendResponse,
    WorkspaceTrendSummary,
    WorkspaceOverview,
    ChannelSummary,
    UserSummary,
)
from app.schemas.common import MetricValue, TimeSeriesPoint, DistributionItem
from app.core.cache import cache
from app.core.config import settings


class WorkspaceInsightsService:
    """Service for workspace insights and analytics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_metrics_for_date(
        self,
        workspace_id: str,
        metric_date: date,
    ) -> Optional[WorkspaceMetricsResponse]:
        """Get workspace metrics for a specific date."""
        cache_key = f"workspace:metrics:{workspace_id}:{metric_date}"
        cached = await cache.get(cache_key)
        if cached:
            return WorkspaceMetricsResponse(**cached)

        query = select(WorkspaceMetrics).where(
            and_(
                WorkspaceMetrics.workspace_id == workspace_id,
                WorkspaceMetrics.metric_date == metric_date,
            )
        )
        result = await self.db.execute(query)
        metrics = result.scalar_one_or_none()

        if not metrics:
            return None

        response = WorkspaceMetricsResponse.model_validate(metrics)
        await cache.set(cache_key, response.model_dump(), settings.CACHE_TTL_MEDIUM)
        return response

    async def get_metrics_trend(
        self,
        workspace_id: str,
        start_date: date,
        end_date: date,
    ) -> WorkspaceTrendResponse:
        """Get workspace metrics trend over a date range."""
        query = (
            select(WorkspaceMetrics)
            .where(
                and_(
                    WorkspaceMetrics.workspace_id == workspace_id,
                    WorkspaceMetrics.metric_date >= start_date,
                    WorkspaceMetrics.metric_date <= end_date,
                )
            )
            .order_by(WorkspaceMetrics.metric_date)
        )
        result = await self.db.execute(query)
        metrics_list = result.scalars().all()

        metrics_responses = [
            WorkspaceMetricsResponse.model_validate(m) for m in metrics_list
        ]

        # Calculate summary
        summary = self._calculate_trend_summary(
            metrics_responses, start_date, end_date
        )

        return WorkspaceTrendResponse(
            workspace_id=workspace_id,
            start_date=start_date,
            end_date=end_date,
            metrics=metrics_responses,
            summary=summary,
        )

    def _calculate_trend_summary(
        self,
        metrics: List[WorkspaceMetricsResponse],
        start_date: date,
        end_date: date,
    ) -> WorkspaceTrendSummary:
        """Calculate summary statistics for trends."""
        if not metrics:
            return WorkspaceTrendSummary(
                total_messages=0,
                avg_daily_messages=0.0,
                total_active_users=0,
                avg_daily_active_users=0.0,
            )

        total_messages = sum(m.total_messages for m in metrics)
        total_days = len(metrics) or 1
        avg_daily_messages = total_messages / total_days

        active_users_set = set()
        total_active_users_sum = sum(m.active_users for m in metrics)
        avg_daily_active_users = total_active_users_sum / total_days

        # Find peak day
        peak_day = max(metrics, key=lambda m: m.total_messages) if metrics else None

        # Calculate change from previous period
        period_length = (end_date - start_date).days + 1
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_length - 1)

        # For now, we'll skip the comparison calculation
        message_change = None
        user_change = None

        return WorkspaceTrendSummary(
            total_messages=total_messages,
            avg_daily_messages=avg_daily_messages,
            total_active_users=total_active_users_sum,
            avg_daily_active_users=avg_daily_active_users,
            peak_day=peak_day.metric_date if peak_day else None,
            peak_day_messages=peak_day.total_messages if peak_day else None,
            message_change_percent=message_change,
            user_change_percent=user_change,
        )

    async def get_workspace_overview(
        self,
        workspace_id: str,
        start_date: date,
        end_date: date,
    ) -> WorkspaceOverview:
        """Get complete workspace overview."""
        cache_key = f"workspace:overview:{workspace_id}:{start_date}:{end_date}"
        cached = await cache.get(cache_key)
        if cached:
            return WorkspaceOverview(**cached)

        # Get trend data
        trend_data = await self.get_metrics_trend(workspace_id, start_date, end_date)

        # Build key metrics
        key_metrics = self._build_key_metrics(trend_data)

        # Build time series for charts
        message_trend = [
            TimeSeriesPoint(
                timestamp=datetime.combine(m.metric_date, datetime.min.time()),
                value=float(m.total_messages),
            )
            for m in trend_data.metrics
        ]

        user_trend = [
            TimeSeriesPoint(
                timestamp=datetime.combine(m.metric_date, datetime.min.time()),
                value=float(m.active_users),
            )
            for m in trend_data.metrics
        ]

        # Calculate distributions
        message_type_distribution = self._calculate_message_type_distribution(
            trend_data.metrics
        )

        # Get hourly distribution
        hourly_distribution = await self._get_hourly_distribution(
            workspace_id, start_date, end_date
        )

        # Get top channels (placeholder - would fetch from message service)
        top_channels = []

        # Get most active users
        most_active_users = await self._get_most_active_users(
            workspace_id, start_date, end_date, limit=5
        )

        overview = WorkspaceOverview(
            workspace_id=workspace_id,
            period_start=start_date,
            period_end=end_date,
            key_metrics=key_metrics,
            message_trend=message_trend,
            user_trend=user_trend,
            message_type_distribution=message_type_distribution,
            hourly_activity_distribution=hourly_distribution,
            top_channels=top_channels,
            most_active_users=most_active_users,
        )

        await cache.set(cache_key, overview.model_dump(), settings.CACHE_TTL_SHORT)
        return overview

    def _build_key_metrics(
        self, trend_data: WorkspaceTrendResponse
    ) -> List[MetricValue]:
        """Build key metrics from trend data."""
        summary = trend_data.summary
        return [
            MetricValue(
                name="Total Messages",
                value=float(summary.total_messages),
                change_percent=summary.message_change_percent,
                trend="up" if (summary.message_change_percent or 0) > 0 else "down",
            ),
            MetricValue(
                name="Avg Daily Messages",
                value=summary.avg_daily_messages,
            ),
            MetricValue(
                name="Avg Daily Active Users",
                value=summary.avg_daily_active_users,
                change_percent=summary.user_change_percent,
                trend="up" if (summary.user_change_percent or 0) > 0 else "down",
            ),
        ]

    def _calculate_message_type_distribution(
        self, metrics: List[WorkspaceMetricsResponse]
    ) -> List[DistributionItem]:
        """Calculate message type distribution."""
        total_channel = sum(m.channel_messages for m in metrics)
        total_dm = sum(m.direct_messages for m in metrics)
        total_thread = sum(m.thread_replies for m in metrics)
        grand_total = total_channel + total_dm + total_thread or 1

        return [
            DistributionItem(
                label="Channel Messages",
                value=float(total_channel),
                percentage=round(total_channel / grand_total * 100, 1),
                color="#4CAF50",
            ),
            DistributionItem(
                label="Direct Messages",
                value=float(total_dm),
                percentage=round(total_dm / grand_total * 100, 1),
                color="#2196F3",
            ),
            DistributionItem(
                label="Thread Replies",
                value=float(total_thread),
                percentage=round(total_thread / grand_total * 100, 1),
                color="#FF9800",
            ),
        ]

    async def _get_hourly_distribution(
        self,
        workspace_id: str,
        start_date: date,
        end_date: date,
    ) -> List[DistributionItem]:
        """Get hourly message distribution."""
        query = (
            select(
                MessageStats.hour,
                func.sum(MessageStats.message_count).label("total"),
            )
            .where(
                and_(
                    MessageStats.workspace_id == workspace_id,
                    MessageStats.stat_date >= start_date,
                    MessageStats.stat_date <= end_date,
                )
            )
            .group_by(MessageStats.hour)
            .order_by(MessageStats.hour)
        )
        result = await self.db.execute(query)
        hourly_data = result.all()

        total_messages = sum(row.total for row in hourly_data) or 1

        return [
            DistributionItem(
                label=f"{row.hour:02d}:00",
                value=float(row.total),
                percentage=round(row.total / total_messages * 100, 1),
            )
            for row in hourly_data
        ]

    async def _get_most_active_users(
        self,
        workspace_id: str,
        start_date: date,
        end_date: date,
        limit: int = 5,
    ) -> List[UserSummary]:
        """Get most active users in the workspace."""
        query = (
            select(
                UserActivity.user_id,
                func.sum(UserActivity.messages_sent).label("message_count"),
                func.sum(UserActivity.reactions_given).label("reaction_count"),
                func.count(UserActivity.activity_date).label("active_days"),
            )
            .where(
                and_(
                    UserActivity.workspace_id == workspace_id,
                    UserActivity.activity_date >= start_date,
                    UserActivity.activity_date <= end_date,
                )
            )
            .group_by(UserActivity.user_id)
            .order_by(func.sum(UserActivity.messages_sent).desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        users = result.all()

        return [
            UserSummary(
                user_id=row.user_id,
                message_count=row.message_count or 0,
                reaction_count=row.reaction_count or 0,
                active_days=row.active_days or 0,
            )
            for row in users
        ]

    async def record_daily_metrics(
        self,
        workspace_id: str,
        metric_date: date,
        metrics_data: dict,
    ) -> WorkspaceMetrics:
        """Record or update daily metrics for a workspace."""
        query = select(WorkspaceMetrics).where(
            and_(
                WorkspaceMetrics.workspace_id == workspace_id,
                WorkspaceMetrics.metric_date == metric_date,
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            for key, value in metrics_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
        else:
            existing = WorkspaceMetrics(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                metric_date=metric_date,
                **metrics_data,
            )
            self.db.add(existing)

        await self.db.commit()
        await self.db.refresh(existing)

        # Invalidate cache
        await cache.delete_pattern(f"workspace:*:{workspace_id}:*")

        return existing
