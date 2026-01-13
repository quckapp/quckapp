import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app, Counter, Histogram
import uvicorn

from api.routes import router, set_ml_models, set_databricks_client
from services.ml_models import MLModels
from services.databricks_client import DatabricksClient
from services.cache import get_cache, close_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Prometheus metrics
PREDICTIONS_TOTAL = Counter(
    "ml_predictions_total",
    "Total number of ML predictions",
    ["model_type"],
)
PREDICTION_LATENCY = Histogram(
    "ml_prediction_latency_seconds",
    "Prediction latency in seconds",
    ["model_type"],
)

# Global instances
ml_models: MLModels = None
databricks_client: DatabricksClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global ml_models, databricks_client

    logger.info("Starting ML Service...")

    # Initialize ML models
    try:
        ml_models = MLModels()
        await ml_models.initialize()
        set_ml_models(ml_models)
        logger.info("ML models initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ML models: {e}")
        raise

    # Initialize Databricks client
    try:
        databricks_client = DatabricksClient()
        set_databricks_client(databricks_client)

        if databricks_client.client:
            logger.info("Databricks client initialized successfully")
        else:
            logger.warning("Databricks client not configured (missing credentials)")
    except Exception as e:
        logger.warning(f"Failed to initialize Databricks client: {e}")

    # Initialize cache
    try:
        cache = await get_cache()
        if cache.enabled:
            logger.info("Redis cache initialized successfully")
        else:
            logger.warning("Redis cache not available")
    except Exception as e:
        logger.warning(f"Failed to initialize cache: {e}")

    logger.info("ML Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down ML Service...")

    await close_cache()

    logger.info("ML Service stopped")


# Create FastAPI app
app = FastAPI(
    title="ML Service",
    description="Machine Learning service with Azure Databricks integration for QuikChat",
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
app.include_router(router, prefix="/api/v1/ml", tags=["ML"])


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "1.0.0",
    }


@app.get("/health/ready")
async def readiness():
    """Readiness check endpoint"""
    checks = {
        "models": "ok" if ml_models and ml_models.initialized else "error",
        "databricks": "ok" if databricks_client and databricks_client.client else "not_configured",
    }

    # Check cache
    try:
        cache = await get_cache()
        checks["cache"] = "ok" if cache.enabled else "not_configured"
    except Exception:
        checks["cache"] = "error"

    all_ok = all(v in ("ok", "not_configured") for v in checks.values())

    return {
        "ready": all_ok,
        "checks": checks,
    }


@app.get("/health/live")
async def liveness():
    """Liveness check endpoint"""
    return {"live": True}


@app.get("/models/info")
async def models_info():
    """Get information about loaded ML models"""
    return {
        "success": True,
        "data": {
            "initialized": ml_models.initialized if ml_models else False,
            "use_transformers": ml_models._use_transformers if ml_models else False,
            "available_features": [
                "sentiment_analysis",
                "content_moderation",
                "smart_reply",
                "entity_extraction",
                "language_detection",
                "summarization",
                "embeddings",
            ],
            "databricks_connected": databricks_client.client is not None if databricks_client else False,
        },
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5008))
    reload_enabled = os.getenv("ENVIRONMENT", "development") == "development"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_enabled,
        log_level="info",
    )
