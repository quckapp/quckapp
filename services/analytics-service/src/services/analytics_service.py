from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.dialects.mysql import insert
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import json
import logging
import uuid

from models.analytics import (
    AnalyticsEvent,
    AnalyticsMetric,
    DailyAggregation,
    UserActivity,
    RetentionCohort,
    ExportJob,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, session: AsyncSession, redis_client=None):
        self.session = session
        self.redis = redis_client

    # ==================== Event Tracking ====================

    async def track_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        channel_id: Optional[str] = None,
        session_id: Optional[str] = None,
        source_service: Optional[str] = None,
        properties: Optional[Dict] = None,
        timestamp: Optional[datetime] = None,
    ) -> AnalyticsEvent:
        """Track an analytics event"""
        event = AnalyticsEvent(
            id=str(uuid.uuid4()),
            event_type=event_type,
            user_id=user_id,
            workspace_id=workspace_id,
            channel_id=channel_id,
            session_id=session_id,
            source_service=source_service,
            properties=properties or {},
            timestamp=timestamp or datetime.utcnow(),
        )

        self.session.add(event)
        await self.session.commit()

        # Update real-time counters in Redis
        if self.redis:
            await self._update_realtime_counters(event)

        # Update daily aggregations
        await self._update_daily_aggregation(event)

        # Update user activity
        if user_id:
            await self._update_user_activity(event)

        return event

    async def _update_realtime_counters(self, event: AnalyticsEvent):
        """Update real-time counters in Redis"""
        try:
            today = event.timestamp.strftime("%Y-%m-%d")
            hour = event.timestamp.hour

            # Increment event type counter
            await self.redis.hincrby(f"analytics:events:{today}", event.event_type, 1)

            # Track unique users
            if event.user_id:
                await self.redis.sadd(f"analytics:users:{today}", event.user_id)

            # Hourly breakdown
            await self.redis.hincrby(f"analytics:hourly:{today}:{event.event_type}", str(hour), 1)

            # Set TTL for keys (7 days)
            for key in [
                f"analytics:events:{today}",
                f"analytics:users:{today}",
                f"analytics:hourly:{today}:{event.event_type}",
            ]:
                await self.redis.expire(key, 7 * 24 * 3600)

        except Exception as e:
            logger.warning(f"Failed to update Redis counters: {e}")

    async def _update_daily_aggregation(self, event: AnalyticsEvent):
        """Update daily aggregation based on event type"""
        event_date = event.timestamp.date()

        # Determine metric type from event
        metric_mapping = {
            "message.sent": "messages",
            "message.read": "messages",
            "message.reaction": "messages",
            "call.started": "calls",
            "call.ended": "calls",
            "call.joined": "calls",
            "file.uploaded": "files",
            "file.downloaded": "files",
            "user.login": "users",
            "user.active": "users",
        }

        metric_type = metric_mapping.get(event.event_type)
        if not metric_type:
            return

        # Get or create aggregation
        stmt = select(DailyAggregation).where(
            and_(
                DailyAggregation.date == event_date,
                DailyAggregation.workspace_id == event.workspace_id,
                DailyAggregation.metric_type == metric_type,
            )
        )
        result = await self.session.execute(stmt)
        agg = result.scalar_one_or_none()

        if not agg:
            agg = DailyAggregation(
                date=event_date,
                workspace_id=event.workspace_id,
                metric_type=metric_type,
                hourly_breakdown=[0] * 24,
            )
            self.session.add(agg)

        # Update counts based on event type
        agg.total_count += 1
        hour = event.timestamp.hour
        hourly = agg.hourly_breakdown or [0] * 24
        hourly[hour] = hourly[hour] + 1
        agg.hourly_breakdown = hourly

        if event.event_type == "message.sent":
            agg.message_count += 1
        elif event.event_type == "message.reaction":
            agg.reaction_count += 1
        elif event.event_type in ("call.started", "call.ended"):
            agg.call_count += 1
            if event.properties.get("duration_seconds"):
                agg.call_duration_seconds += event.properties["duration_seconds"]
        elif event.event_type == "file.uploaded":
            agg.file_count += 1
            if event.properties.get("file_size"):
                agg.file_size_bytes += event.properties["file_size"]

        # Update type breakdown
        breakdown = agg.breakdown_by_type or {}
        sub_type = event.properties.get("type", "other")
        breakdown[sub_type] = breakdown.get(sub_type, 0) + 1
        agg.breakdown_by_type = breakdown

        await self.session.commit()

    async def _update_user_activity(self, event: AnalyticsEvent):
        """Update user activity record"""
        event_date = event.timestamp.date()

        stmt = select(UserActivity).where(
            and_(
                UserActivity.user_id == event.user_id,
                UserActivity.date == event_date,
            )
        )
        result = await self.session.execute(stmt)
        activity = result.scalar_one_or_none()

        if not activity:
            activity = UserActivity(
                user_id=event.user_id,
                workspace_id=event.workspace_id,
                date=event_date,
                first_seen_at=event.timestamp,
            )
            self.session.add(activity)

        activity.last_seen_at = event.timestamp

        # Update counts based on event type
        if event.event_type == "message.sent":
            activity.messages_sent += 1
        elif event.event_type == "message.read":
            activity.messages_read += 1
        elif event.event_type == "message.reaction":
            activity.reactions_given += 1
        elif event.event_type == "file.uploaded":
            activity.files_uploaded += 1
        elif event.event_type in ("call.joined", "call.started"):
            activity.calls_joined += 1
        elif event.event_type == "call.ended":
            if event.properties.get("duration_seconds"):
                activity.call_duration_seconds += event.properties["duration_seconds"]

        await self.session.commit()

    # ==================== Metrics ====================

    async def record_metric(
        self,
        metric_name: str,
        value: float,
        workspace_id: Optional[str] = None,
        dimensions: Optional[Dict] = None,
        timestamp: Optional[datetime] = None,
    ) -> AnalyticsMetric:
        """Record a metric value"""
        metric = AnalyticsMetric(
            metric_name=metric_name,
            value=value,
            workspace_id=workspace_id,
            dimensions=dimensions or {},
            timestamp=timestamp or datetime.utcnow(),
        )

        self.session.add(metric)
        await self.session.commit()

        return metric

    # ==================== Dashboard Queries ====================

    async def get_dashboard_overview(
        self,
        workspace_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Get dashboard overview metrics"""
        # Try Redis first for recent data
        if self.redis and (datetime.utcnow() - end_date).days < 1:
            cached = await self._get_cached_overview(workspace_id)
            if cached:
                return cached

        # Query aggregated data
        stmt = select(
            DailyAggregation.metric_type,
            func.sum(DailyAggregation.total_count).label("total"),
            func.sum(DailyAggregation.message_count).label("messages"),
            func.sum(DailyAggregation.call_count).label("calls"),
            func.sum(DailyAggregation.call_duration_seconds).label("call_duration"),
            func.sum(DailyAggregation.file_count).label("files"),
        ).where(
            and_(
                DailyAggregation.date >= start_date.date(),
                DailyAggregation.date <= end_date.date(),
                or_(
                    DailyAggregation.workspace_id == workspace_id,
                    workspace_id is None,
                ),
            )
        ).group_by(DailyAggregation.metric_type)

        result = await self.session.execute(stmt)
        rows = result.all()

        # Get unique users count
        user_stmt = select(func.count(func.distinct(UserActivity.user_id))).where(
            and_(
                UserActivity.date >= start_date.date(),
                UserActivity.date <= end_date.date(),
                or_(
                    UserActivity.workspace_id == workspace_id,
                    workspace_id is None,
                ),
            )
        )
        user_result = await self.session.execute(user_stmt)
        active_users = user_result.scalar() or 0

        # Build response
        overview = {
            "total_users": 0,
            "active_users": active_users,
            "messages_sent": 0,
            "calls_made": 0,
            "call_duration_minutes": 0,
            "files_shared": 0,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
        }

        for row in rows:
            if row.metric_type == "messages":
                overview["messages_sent"] = int(row.messages or 0)
            elif row.metric_type == "calls":
                overview["calls_made"] = int(row.calls or 0)
                overview["call_duration_minutes"] = int((row.call_duration or 0) / 60)
            elif row.metric_type == "files":
                overview["files_shared"] = int(row.files or 0)
            elif row.metric_type == "users":
                overview["total_users"] = int(row.total or 0)

        return overview

    async def _get_cached_overview(self, workspace_id: Optional[str]) -> Optional[Dict]:
        """Get cached overview from Redis"""
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            key = f"analytics:overview:{workspace_id or 'all'}:{today}"
            cached = await self.redis.get(key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass
        return None

    async def get_user_activity(
        self,
        user_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get user activity analytics"""
        start_date = date.today() - timedelta(days=days)

        stmt = select(
            func.sum(UserActivity.messages_sent).label("messages_sent"),
            func.sum(UserActivity.messages_read).label("messages_read"),
            func.sum(UserActivity.reactions_given).label("reactions"),
            func.sum(UserActivity.files_uploaded).label("files"),
            func.sum(UserActivity.calls_joined).label("calls"),
            func.sum(UserActivity.call_duration_seconds).label("call_duration"),
            func.sum(UserActivity.active_minutes).label("active_minutes"),
            func.max(UserActivity.last_seen_at).label("last_active"),
            func.count(UserActivity.id).label("active_days"),
        ).where(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.date >= start_date,
            )
        )

        result = await self.session.execute(stmt)
        row = result.one()

        return {
            "user_id": user_id,
            "period_days": days,
            "messages_sent": int(row.messages_sent or 0),
            "messages_read": int(row.messages_read or 0),
            "reactions_given": int(row.reactions or 0),
            "files_uploaded": int(row.files or 0),
            "calls_joined": int(row.calls or 0),
            "call_duration_minutes": int((row.call_duration or 0) / 60),
            "active_minutes": int(row.active_minutes or 0),
            "active_days": int(row.active_days or 0),
            "last_active": row.last_active.isoformat() if row.last_active else None,
        }

    async def get_message_stats(
        self,
        workspace_id: Optional[str],
        channel_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Get message statistics"""
        conditions = [
            DailyAggregation.date >= start_date.date(),
            DailyAggregation.date <= end_date.date(),
            DailyAggregation.metric_type == "messages",
        ]

        if workspace_id:
            conditions.append(DailyAggregation.workspace_id == workspace_id)

        stmt = select(
            DailyAggregation.date,
            DailyAggregation.message_count,
            DailyAggregation.reaction_count,
            DailyAggregation.thread_count,
            DailyAggregation.hourly_breakdown,
            DailyAggregation.breakdown_by_type,
        ).where(and_(*conditions)).order_by(DailyAggregation.date)

        result = await self.session.execute(stmt)
        rows = result.all()

        total_messages = 0
        total_reactions = 0
        total_threads = 0
        hourly_totals = [0] * 24
        type_totals = {}
        daily_data = []

        for row in rows:
            total_messages += row.message_count or 0
            total_reactions += row.reaction_count or 0
            total_threads += row.thread_count or 0

            if row.hourly_breakdown:
                for i, count in enumerate(row.hourly_breakdown):
                    hourly_totals[i] += count

            if row.breakdown_by_type:
                for msg_type, count in row.breakdown_by_type.items():
                    type_totals[msg_type] = type_totals.get(msg_type, 0) + count

            daily_data.append({
                "date": row.date.isoformat(),
                "messages": row.message_count or 0,
                "reactions": row.reaction_count or 0,
            })

        # Get top channels if workspace specified
        top_channels = []
        if workspace_id:
            channel_stmt = select(
                AnalyticsEvent.channel_id,
                func.count(AnalyticsEvent.id).label("count"),
            ).where(
                and_(
                    AnalyticsEvent.workspace_id == workspace_id,
                    AnalyticsEvent.event_type == "message.sent",
                    AnalyticsEvent.timestamp >= start_date,
                    AnalyticsEvent.timestamp <= end_date,
                    AnalyticsEvent.channel_id.isnot(None),
                )
            ).group_by(AnalyticsEvent.channel_id).order_by(
                func.count(AnalyticsEvent.id).desc()
            ).limit(10)

            channel_result = await self.session.execute(channel_stmt)
            top_channels = [
                {"channel_id": row.channel_id, "message_count": row.count}
                for row in channel_result.all()
            ]

        return {
            "total_messages": total_messages,
            "total_reactions": total_reactions,
            "total_threads": total_threads,
            "messages_by_type": type_totals,
            "messages_by_hour": hourly_totals,
            "daily_breakdown": daily_data,
            "top_channels": top_channels,
        }

    async def get_call_stats(
        self,
        workspace_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Get call statistics"""
        conditions = [
            DailyAggregation.date >= start_date.date(),
            DailyAggregation.date <= end_date.date(),
            DailyAggregation.metric_type == "calls",
        ]

        if workspace_id:
            conditions.append(DailyAggregation.workspace_id == workspace_id)

        stmt = select(
            func.sum(DailyAggregation.call_count).label("total_calls"),
            func.sum(DailyAggregation.call_duration_seconds).label("total_duration"),
        ).where(and_(*conditions))

        result = await self.session.execute(stmt)
        row = result.one()

        total_calls = int(row.total_calls or 0)
        total_duration = int(row.total_duration or 0)
        avg_duration = (total_duration / total_calls) if total_calls > 0 else 0

        # Get call type breakdown
        type_stmt = select(
            DailyAggregation.breakdown_by_type,
        ).where(and_(*conditions))

        type_result = await self.session.execute(type_stmt)
        type_rows = type_result.all()

        calls_by_type = {}
        for type_row in type_rows:
            if type_row.breakdown_by_type:
                for call_type, count in type_row.breakdown_by_type.items():
                    calls_by_type[call_type] = calls_by_type.get(call_type, 0) + count

        return {
            "total_calls": total_calls,
            "total_duration_minutes": total_duration // 60,
            "avg_duration_minutes": round(avg_duration / 60, 1),
            "calls_by_type": calls_by_type,
        }

    async def get_retention_metrics(
        self,
        workspace_id: Optional[str],
        cohort_date: date,
    ) -> Dict[str, Any]:
        """Get user retention metrics for a cohort"""
        stmt = select(RetentionCohort).where(
            and_(
                RetentionCohort.cohort_date == cohort_date,
                or_(
                    RetentionCohort.workspace_id == workspace_id,
                    workspace_id is None,
                ),
            )
        )

        result = await self.session.execute(stmt)
        cohort = result.scalar_one_or_none()

        if cohort:
            retention_data = cohort.retention_data or {}
            cohort_size = cohort.cohort_size

            return {
                "cohort_date": cohort_date.isoformat(),
                "cohort_size": cohort_size,
                "day_1": retention_data.get("day_1", 0),
                "day_7": retention_data.get("day_7", 0),
                "day_14": retention_data.get("day_14", 0),
                "day_30": retention_data.get("day_30", 0),
                "day_1_pct": round((retention_data.get("day_1", 0) / cohort_size * 100) if cohort_size > 0 else 0, 1),
                "day_7_pct": round((retention_data.get("day_7", 0) / cohort_size * 100) if cohort_size > 0 else 0, 1),
                "day_14_pct": round((retention_data.get("day_14", 0) / cohort_size * 100) if cohort_size > 0 else 0, 1),
                "day_30_pct": round((retention_data.get("day_30", 0) / cohort_size * 100) if cohort_size > 0 else 0, 1),
            }

        # Calculate retention from user activity if no cohort exists
        return await self._calculate_retention(workspace_id, cohort_date)

    async def _calculate_retention(
        self,
        workspace_id: Optional[str],
        cohort_date: date,
    ) -> Dict[str, Any]:
        """Calculate retention metrics from user activity data"""
        # Get users who were active on cohort date
        cohort_stmt = select(func.distinct(UserActivity.user_id)).where(
            and_(
                UserActivity.date == cohort_date,
                or_(
                    UserActivity.workspace_id == workspace_id,
                    workspace_id is None,
                ),
            )
        )

        cohort_result = await self.session.execute(cohort_stmt)
        cohort_users = [row[0] for row in cohort_result.all()]
        cohort_size = len(cohort_users)

        if cohort_size == 0:
            return {
                "cohort_date": cohort_date.isoformat(),
                "cohort_size": 0,
                "day_1": 0,
                "day_7": 0,
                "day_14": 0,
                "day_30": 0,
            }

        # Calculate retention for each period
        retention = {"day_1": 0, "day_7": 0, "day_14": 0, "day_30": 0}

        for period, days in [("day_1", 1), ("day_7", 7), ("day_14", 14), ("day_30", 30)]:
            target_date = cohort_date + timedelta(days=days)
            if target_date > date.today():
                continue

            retained_stmt = select(func.count(func.distinct(UserActivity.user_id))).where(
                and_(
                    UserActivity.user_id.in_(cohort_users),
                    UserActivity.date == target_date,
                )
            )
            retained_result = await self.session.execute(retained_stmt)
            retention[period] = retained_result.scalar() or 0

        return {
            "cohort_date": cohort_date.isoformat(),
            "cohort_size": cohort_size,
            **retention,
            "day_1_pct": round((retention["day_1"] / cohort_size * 100) if cohort_size > 0 else 0, 1),
            "day_7_pct": round((retention["day_7"] / cohort_size * 100) if cohort_size > 0 else 0, 1),
            "day_14_pct": round((retention["day_14"] / cohort_size * 100) if cohort_size > 0 else 0, 1),
            "day_30_pct": round((retention["day_30"] / cohort_size * 100) if cohort_size > 0 else 0, 1),
        }

    # ==================== Export ====================

    async def create_export_job(
        self,
        user_id: str,
        report_type: str,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv",
        workspace_id: Optional[str] = None,
        filters: Optional[Dict] = None,
    ) -> ExportJob:
        """Create an export job"""
        job = ExportJob(
            id=str(uuid.uuid4()),
            user_id=user_id,
            workspace_id=workspace_id,
            report_type=report_type,
            format=format,
            start_date=start_date,
            end_date=end_date,
            filters=filters or {},
            status="pending",
        )

        self.session.add(job)
        await self.session.commit()

        return job

    async def get_export_job(self, job_id: str) -> Optional[ExportJob]:
        """Get export job by ID"""
        stmt = select(ExportJob).where(ExportJob.id == job_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_user_export_jobs(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[ExportJob]:
        """List export jobs for a user"""
        stmt = select(ExportJob).where(
            ExportJob.user_id == user_id
        ).order_by(ExportJob.created_at.desc()).limit(limit)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())
