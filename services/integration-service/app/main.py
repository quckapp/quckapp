"""
QuikApp Integration Service

Manages third-party integrations with Jira, GitHub, Google Drive, and more.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.core.config import settings
from app.core.database import engine, Base
from app.api import health, integrations, webhooks, oauth


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
    title="QuikApp Integration Service",
    description="Third-party Integrations API",
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
    integrations.router,
    prefix="/api/v1/integrations",
    tags=["Integrations"],
)
app.include_router(
    webhooks.router,
    prefix="/api/v1/webhooks",
    tags=["Webhooks"],
)
app.include_router(
    oauth.router,
    prefix="/api/v1/oauth",
    tags=["OAuth"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "integration-service",
        "version": "1.0.0",
        "status": "running",
    }
