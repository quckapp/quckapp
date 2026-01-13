"""Message insights service."""

import uuid
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message_stats import MessageStats
from app.schemas.message import (
    MessageStatsResponse,
    HourlyDistributionResponse,
    HourlyDataPoint,
    ChannelAnalyticsResponse,
    ChannelContributor,
)
from app.schemas.common import TimeSeriesPoint, DistributionItem
from app.core.cache import cache
from app.core.config import settings


class MessageInsightsService:
    """Service for message insights and analytics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_message_stats(
        self,
        workspace_id: str,
        stat_date: date,
        channel_id: Optional[str] = None,
    ) -> List[MessageStatsResponse]:
        """Get message stats for a specific date."""
        conditions = [
            MessageStats.workspace_id == workspace_id,
            MessageStats.stat_date == stat_date,
        ]
        if channel_id:
            conditions.append(MessageStats.channel_id == channel_id)

        query = (
            select(MessageStats)
            .where(and_(*conditions))
            .order_by(MessageStats.hour)
        )
        result = await self.db.execute(query)
        stats = result.scalars().all()

        return [MessageStatsResponse.model_validate(s) for s in stats]

    async def get_hourly_distribution(
        self,
        workspace_id: str,
        start_date: date,
        end_date: date,
        channel_id: Optional[str] = None,
    ) -> HourlyDistributionResponse:
        """Get message distribution by hour."""
        cache_key = f"hourly:{workspace_id}:{channel_id or 'all'}:{start_date}:{end_date}"
        cached = await cache.get(cache_key)
        if cached:
            return HourlyDistributionResponse(**cached)

        conditions = [
            MessageStats.workspace_id == workspace_id,
            MessageStats.stat_date >= start_date,
            MessageStats.stat_date <= end_date,
        ]
        if channel_id:
            conditions.append(MessageStats.channel_id == channel_id)

        query = (
            select(
                MessageStats.hour,
                func.sum(MessageStats.message_count).label("total"),
                func.avg(MessageStats.message_count).label("avg"),
            )
            .where(and_(*conditions))
            .group_by(MessageStats.hour)
            .order_by(MessageStats.hour)
        )
        result = await self.db.execute(query)
        hourly_data = result.all()

        total_messages = sum(row.total for row in hourly_data) or 1

        hourly_points = [
            HourlyDataPoint(
                hour=row.hour,
                avg_messages=float(row.avg or 0),
                total_messages=int(row.total or 0),
                percentage_of_total=round((row.total or 0) / total_messages * 100, 1),
            )
            for row in hourly_data
        ]

        # Fill in missing hours
        existing_hours = {p.hour for p in hourly_points}
        for hour in range(24):
            if hour not in existing_hours:
                hourly_points.append(
                    HourlyDataPoint(
                        hour=hour,
                        avg_messages=0.0,
                        total_messages=0,
                        percentage_of_total=0.0,
                    )
                )
        hourly_points.sort(key=lambda x: x.hour)

        # Find peak and quietest hours
        peak = max(hourly_points, key=lambda x: x.avg_messages)
        quietest = min(hourly_points, key=lambda x: x.avg_messages)

        response = HourlyDistributionResponse(
            workspace_id=workspace_id,
            channel_id=channel_id,
            period_start=start_date,
            period_end=end_date,
            hourly_data=hourly_points,
            peak_hour=peak.hour,
            peak_hour_avg_messages=peak.avg_messages,
            quietest_hour=quietest.hour,
            quietest_hour_avg_messages=quietest.avg_messages,
        )

        await cache.set(cache_key, response.model_dump(), settings.CACHE_TTL_MEDIUM)
        return response

    async def get_channel_analytics(
        self,
        workspace_id: str,
        channel_id: str,
        start_date: date,
        end_date: date,
    ) -> ChannelAnalyticsResponse:
        """Get analytics for a specific channel."""
        cache_key = f"channel:{workspace_id}:{channel_id}:{start_date}:{end_date}"
        cached = await cache.get(cache_key)
        if cached:
            return ChannelAnalyticsResponse(**cached)

        # Get aggregated stats
        query = (
            select(
                func.sum(MessageStats.message_count).label("total_messages"),
                func.sum(MessageStats.thread_count).label("total_threads"),
                func.sum(MessageStats.reply_count).label("total_replies"),
                func.sum(MessageStats.unique_senders).label("unique_contributors"),
                func.avg(MessageStats.avg_message_length).label("avg_length"),
                func.sum(MessageStats.messages_with_files).label("with_files"),
                func.sum(MessageStats.messages_with_links).label("with_links"),
                func.sum(MessageStats.total_reactions).label("total_reactions"),
            )
            .where(
                and_(
                    MessageStats.workspace_id == workspace_id,
                    MessageStats.channel_id == channel_id,
                    MessageStats.stat_date >= start_date,
                    MessageStats.stat_date <= end_date,
                )
            )
        )
        result = await self.db.execute(query)
        stats = result.one()

        days = (end_date - start_date).days + 1
        total_messages = stats.total_messages or 0
        total_threads = stats.total_threads or 0
        total_replies = stats.total_replies or 0

        # Get daily trend
        daily_query = (
            select(
                MessageStats.stat_date,
                func.sum(MessageStats.message_count).label("messages"),
                func.sum(MessageStats.unique_senders).label("senders"),
            )
            .where(
                and_(
                    MessageStats.workspace_id == workspace_id,
                    MessageStats.channel_id == channel_id,
                    MessageStats.stat_date >= start_date,
                    MessageStats.stat_date <= end_date,
                )
            )
            .group_by(MessageStats.stat_date)
            .order_by(MessageStats.stat_date)
        )
        daily_result = await self.db.execute(daily_query)
        daily_data = daily_result.all()

        message_trend = [
            TimeSeriesPoint(
                timestamp=datetime.combine(row.stat_date, datetime.min.time()),
                value=float(row.messages or 0),
            )
            for row in daily_data
        ]

        contributor_trend = [
            TimeSeriesPoint(
                timestamp=datetime.combine(row.stat_date, datetime.min.time()),
                value=float(row.senders or 0),
            )
            for row in daily_data
        ]

        # Content type distribution
        with_files = stats.with_files or 0
        with_links = stats.with_links or 0
        plain = max(0, total_messages - with_files - with_links)

        content_types = [
            DistributionItem(
                label="Plain Text",
                value=float(plain),
                percentage=round(plain / max(1, total_messages) * 100, 1),
                color="#607D8B",
            ),
            DistributionItem(
                label="With Files",
                value=float(with_files),
                percentage=round(with_files / max(1, total_messages) * 100, 1),
                color="#4CAF50",
            ),
            DistributionItem(
                label="With Links",
                value=float(with_links),
                percentage=round(with_links / max(1, total_messages) * 100, 1),
                color="#2196F3",
            ),
        ]

        response = ChannelAnalyticsResponse(
            workspace_id=workspace_id,
            channel_id=channel_id,
            period_start=start_date,
            period_end=end_date,
            total_messages=total_messages,
            total_threads=total_threads,
            total_replies=total_replies,
            unique_contributors=stats.unique_contributors or 0,
            avg_daily_messages=total_messages / days if days > 0 else 0,
            message_trend=message_trend,
            contributor_trend=contributor_trend,
            top_contributors=[],  # Would need user activity data
            content_types=content_types,
            avg_thread_replies=(
                total_replies / total_threads if total_threads > 0 else 0
            ),
            avg_reactions_per_message=(
                (stats.total_reactions or 0) / total_messages
                if total_messages > 0
                else 0
            ),
        )

        await cache.set(cache_key, response.model_dump(), settings.CACHE_TTL_MEDIUM)
        return response

    async def record_message_stats(
        self,
        workspace_id: str,
        stat_date: date,
        hour: int,
        channel_id: Optional[str],
        stats_data: dict,
    ) -> MessageStats:
        """Record message stats for a specific hour."""
        conditions = [
            MessageStats.workspace_id == workspace_id,
            MessageStats.stat_date == stat_date,
            MessageStats.hour == hour,
        ]
        if channel_id:
            conditions.append(MessageStats.channel_id == channel_id)
        else:
            conditions.append(MessageStats.channel_id.is_(None))

        query = select(MessageStats).where(and_(*conditions))
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            for key, value in stats_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
        else:
            existing = MessageStats(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                stat_date=stat_date,
                hour=hour,
                channel_id=channel_id,
                **stats_data,
            )
            self.db.add(existing)

        await self.db.commit()
        await self.db.refresh(existing)

        # Invalidate cache
        pattern = f"*:{workspace_id}:*"
        await cache.delete_pattern(pattern)

        return existing
