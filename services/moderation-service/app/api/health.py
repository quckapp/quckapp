from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "moderation-service",
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {"status": "ready"}
