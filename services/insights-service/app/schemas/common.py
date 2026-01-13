"""Common schema definitions."""

from datetime import date, datetime
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class DateRangeQuery(BaseModel):
    """Date range query parameters."""

    start_date: date = Field(..., description="Start date for the query")
    end_date: date = Field(..., description="End date for the query")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""

    items: List[T]
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int = 1,
        page_size: int = 20,
    ) -> "PaginatedResponse[T]":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


class MetricValue(BaseModel):
    """A single metric with value and optional comparison."""

    name: str
    value: float
    previous_value: Optional[float] = None
    change_percent: Optional[float] = None
    trend: Optional[str] = None  # "up", "down", "stable"


class TimeSeriesPoint(BaseModel):
    """A point in a time series."""

    timestamp: datetime
    value: float
    label: Optional[str] = None


class DistributionItem(BaseModel):
    """An item in a distribution breakdown."""

    label: str
    value: float
    percentage: float
    color: Optional[str] = None
