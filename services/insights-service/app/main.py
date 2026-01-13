"""
QuikApp Insights Service

Provides analytics, metrics, and business intelligence for the platform.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.core.config import settings
from app.core.database import engine, Base
from app.api import health, workspace_insights, user_insights, message_insights, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="QuikApp Insights Service",
    description="Analytics and Business Intelligence API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(
    workspace_insights.router,
    prefix="/api/v1/insights/workspaces",
    tags=["Workspace Insights"],
)
app.include_router(
    user_insights.router,
    prefix="/api/v1/insights/users",
    tags=["User Insights"],
)
app.include_router(
    message_insights.router,
    prefix="/api/v1/insights/messages",
    tags=["Message Insights"],
)
app.include_router(
    reports.router,
    prefix="/api/v1/reports",
    tags=["Reports"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "insights-service",
        "version": "1.0.0",
        "status": "running",
    }
