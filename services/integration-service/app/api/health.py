"""Health check endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "integration-service",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness check including dependencies."""
    status = {
        "status": "ready",
        "service": "integration-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {},
    }

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        status["dependencies"]["database"] = "healthy"
    except Exception as e:
        status["dependencies"]["database"] = f"unhealthy: {str(e)}"
        status["status"] = "not_ready"

    return status


@router.get("/health/live")
async def liveness_check():
    """Liveness check."""
    return {
        "status": "alive",
        "service": "integration-service",
        "timestamp": datetime.utcnow().isoformat(),
    }
