import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app, Counter, Histogram
import uvicorn

from api.routes import router
from services.database import init_db, close_db, check_db_health, get_db, get_redis
from services.kafka_consumer import create_kafka_consumer
from services.analytics_service import AnalyticsService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Prometheus metrics
EVENTS_TRACKED = Counter(
    "analytics_events_tracked_total",
    "Total number of analytics events tracked",
    ["event_type"],
)
REQUEST_LATENCY = Histogram(
    "analytics_request_latency_seconds",
    "Request latency in seconds",
    ["endpoint"],
)

# Global Kafka consumer reference
kafka_consumer = None


async def handle_kafka_event(event_type: str, event_data: Dict[str, Any]):
    """Handle events from Kafka consumer"""
    try:
        async for session in get_db():
            redis_client = get_redis()
            service = AnalyticsService(session, redis_client)

            await service.track_event(
                event_type=event_data.get("event_type", event_type),
                user_id=event_data.get("user_id"),
                workspace_id=event_data.get("workspace_id"),
                channel_id=event_data.get("channel_id"),
                session_id=event_data.get("session_id"),
                source_service=event_data.get("source_service"),
                properties=event_data.get("properties", {}),
                timestamp=event_data.get("timestamp"),
            )

            EVENTS_TRACKED.labels(event_type=event_type).inc()
            break

    except Exception as e:
        logger.error(f"Failed to handle Kafka event: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global kafka_consumer

    logger.info("Starting Analytics Service...")

    # Initialize database connections
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    # Start Kafka consumer
    try:
        kafka_consumer = await create_kafka_consumer(handle_kafka_event)
        if kafka_consumer:
            logger.info("Kafka consumer started successfully")
        else:
            logger.warning("Kafka consumer not started (disabled or connection failed)")
    except Exception as e:
        logger.warning(f"Failed to start Kafka consumer: {e}")

    logger.info("Analytics Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down Analytics Service...")

    if kafka_consumer:
        await kafka_consumer.stop()

    await close_db()

    logger.info("Analytics Service stopped")


# Create FastAPI app
app = FastAPI(
    title="Analytics Service",
    description="Analytics and metrics tracking service for QuikChat",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include API routes
app.include_router(router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "analytics-service",
        "version": "1.0.0",
    }


@app.get("/health/ready")
async def readiness():
    """Readiness check endpoint"""
    checks = await check_db_health()

    all_ok = all(v == "ok" or v == "not_configured" for v in checks.values())

    return {
        "ready": all_ok,
        "checks": checks,
    }


@app.get("/health/live")
async def liveness():
    """Liveness check endpoint"""
    return {"live": True}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5007))
    reload_enabled = os.getenv("ENVIRONMENT", "development") == "development"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_enabled,
        log_level="info",
    )
