"""Health check endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.file_service import file_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "export-service",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness check including dependencies."""
    status = {
        "status": "ready",
        "service": "export-service",
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

    # Check storage
    status["dependencies"]["storage"] = "s3" if file_service.use_s3 else "local"

    return status


@router.get("/health/live")
async def liveness_check():
    """Liveness check."""
    return {
        "status": "alive",
        "service": "export-service",
        "timestamp": datetime.utcnow().isoformat(),
    }
