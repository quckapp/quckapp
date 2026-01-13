"""Report generation service."""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.insight_report import InsightReport, ReportType, ReportStatus
from app.schemas.report import (
    ReportRequest,
    ReportResponse,
    ReportListResponse,
)
from app.services.workspace_service import WorkspaceInsightsService
from app.services.user_service import UserInsightsService
from app.services.message_service import MessageInsightsService


class ReportService:
    """Service for generating and managing insight reports."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.workspace_service = WorkspaceInsightsService(db)
        self.user_service = UserInsightsService(db)
        self.message_service = MessageInsightsService(db)

    async def create_report(
        self,
        request: ReportRequest,
        created_by: str,
    ) -> ReportResponse:
        """Create a new insight report."""
        report = InsightReport(
            id=str(uuid.uuid4()),
            workspace_id=request.workspace_id,
            name=request.name,
            report_type=ReportType(request.report_type),
            status=ReportStatus.PENDING,
            parameters=request.parameters,
            start_date=request.start_date,
            end_date=request.end_date,
            created_by=created_by,
        )

        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)

        # Generate report immediately (in production, this would be async)
        await self._generate_report(report)

        return ReportResponse.model_validate(report)

    async def get_report(self, report_id: str) -> Optional[ReportResponse]:
        """Get a report by ID."""
        query = select(InsightReport).where(InsightReport.id == report_id)
        result = await self.db.execute(query)
        report = result.scalar_one_or_none()

        if not report:
            return None

        return ReportResponse.model_validate(report)

    async def list_reports(
        self,
        workspace_id: str,
        page: int = 1,
        page_size: int = 20,
        report_type: Optional[str] = None,
    ) -> ReportListResponse:
        """List reports for a workspace."""
        conditions = [InsightReport.workspace_id == workspace_id]
        if report_type:
            conditions.append(InsightReport.report_type == ReportType(report_type))

        # Count total
        count_query = select(InsightReport).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = len(count_result.scalars().all())

        # Get page
        offset = (page - 1) * page_size
        query = (
            select(InsightReport)
            .where(and_(*conditions))
            .order_by(desc(InsightReport.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        reports = result.scalars().all()

        return ReportListResponse(
            reports=[ReportResponse.model_validate(r) for r in reports],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def delete_report(self, report_id: str) -> bool:
        """Delete a report."""
        query = select(InsightReport).where(InsightReport.id == report_id)
        result = await self.db.execute(query)
        report = result.scalar_one_or_none()

        if not report:
            return False

        await self.db.delete(report)
        await self.db.commit()
        return True

    async def _generate_report(self, report: InsightReport) -> None:
        """Generate report data based on type."""
        try:
            report.status = ReportStatus.PROCESSING
            await self.db.commit()

            result_data = {}

            if report.report_type == ReportType.WORKSPACE_SUMMARY:
                result_data = await self._generate_workspace_summary(report)
            elif report.report_type == ReportType.USER_ENGAGEMENT:
                result_data = await self._generate_user_engagement(report)
            elif report.report_type == ReportType.MESSAGE_ANALYTICS:
                result_data = await self._generate_message_analytics(report)
            elif report.report_type == ReportType.CHANNEL_PERFORMANCE:
                result_data = await self._generate_channel_performance(report)
            elif report.report_type == ReportType.TEAM_PRODUCTIVITY:
                result_data = await self._generate_team_productivity(report)
            else:
                result_data = {"message": "Custom report type - no auto-generation"}

            report.result_data = result_data
            report.status = ReportStatus.COMPLETED
            report.completed_at = datetime.utcnow()

        except Exception as e:
            report.status = ReportStatus.FAILED
            report.error_message = str(e)

        await self.db.commit()

    async def _generate_workspace_summary(self, report: InsightReport) -> dict:
        """Generate workspace summary report."""
        overview = await self.workspace_service.get_workspace_overview(
            report.workspace_id,
            report.start_date,
            report.end_date,
        )
        return overview.model_dump()

    async def _generate_user_engagement(self, report: InsightReport) -> dict:
        """Generate user engagement report."""
        top_users = await self.user_service.get_top_users(
            report.workspace_id,
            report.start_date,
            report.end_date,
            metric_type="messages",
            limit=20,
        )

        return {
            "top_users": top_users.model_dump(),
            "period": {
                "start": str(report.start_date),
                "end": str(report.end_date),
            },
        }

    async def _generate_message_analytics(self, report: InsightReport) -> dict:
        """Generate message analytics report."""
        hourly = await self.message_service.get_hourly_distribution(
            report.workspace_id,
            report.start_date,
            report.end_date,
        )

        return {
            "hourly_distribution": hourly.model_dump(),
            "period": {
                "start": str(report.start_date),
                "end": str(report.end_date),
            },
        }

    async def _generate_channel_performance(self, report: InsightReport) -> dict:
        """Generate channel performance report."""
        # Would aggregate data from multiple channels
        return {
            "message": "Channel performance data",
            "period": {
                "start": str(report.start_date),
                "end": str(report.end_date),
            },
        }

    async def _generate_team_productivity(self, report: InsightReport) -> dict:
        """Generate team productivity report."""
        # Would combine user and message data for productivity metrics
        return {
            "message": "Team productivity data",
            "period": {
                "start": str(report.start_date),
                "end": str(report.end_date),
            },
        }
