from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.api import moderation, rules, health
from app.core.config import settings
from app.db.database import engine, Base

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting moderation service", port=settings.PORT)
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    logger.info("Shutting down moderation service")

app = FastAPI(
    title="Moderation Service",
    description="QuikApp Content Moderation and Safety Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(moderation.router, prefix="/api/moderation", tags=["Moderation"])
app.include_router(rules.router, prefix="/api/moderation/rules", tags=["Rules"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
