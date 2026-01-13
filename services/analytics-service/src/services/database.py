from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import os
import redis.asyncio as redis
import logging
from models.analytics import Base

logger = logging.getLogger(__name__)

engine = None
async_session_factory = None
redis_client = None


async def init_db():
    """Initialize database connections"""
    global engine, async_session_factory, redis_client

    # MySQL connection
    mysql_url = os.getenv(
        "MYSQL_URL",
        "mysql+aiomysql://root:password@localhost:3306/quckchat_analytics"
    )

    engine = create_async_engine(
        mysql_url,
        echo=os.getenv("DEBUG", "false").lower() == "true",
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Connected to MySQL database")

    # Redis connection
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    redis_password = os.getenv("REDIS_PASSWORD", None)

    try:
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            db=8,
            decode_responses=True,
        )
        await redis_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {e}")
        redis_client = None


async def close_db():
    """Close database connections"""
    global engine, redis_client

    if engine:
        await engine.dispose()
        logger.info("MySQL connection closed")

    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


async def get_db() -> AsyncSession:
    """Get database session"""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


def get_redis() -> redis.Redis:
    """Get Redis client"""
    return redis_client


async def check_db_health() -> dict:
    """Check database health"""
    result = {"mysql": "error", "redis": "error"}

    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            result["mysql"] = "ok"
    except Exception as e:
        result["mysql_error"] = str(e)

    try:
        if redis_client:
            await redis_client.ping()
            result["redis"] = "ok"
        else:
            result["redis"] = "not_configured"
    except Exception as e:
        result["redis_error"] = str(e)

    return result
