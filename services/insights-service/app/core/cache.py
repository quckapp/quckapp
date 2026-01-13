"""Redis cache management."""

import json
from typing import Any, Optional
import redis.asyncio as redis

from app.core.config import settings


class CacheManager:
    """Async Redis cache manager."""

    def __init__(self):
        self.redis: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Connect to Redis."""
        self.redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD or None,
            decode_responses=True,
        )

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.redis:
            return None
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception:
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = settings.CACHE_TTL_MEDIUM,
    ) -> bool:
        """Set value in cache with TTL."""
        if not self.redis:
            return False
        try:
            await self.redis.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.redis:
            return False
        try:
            await self.redis.delete(key)
            return True
        except Exception:
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self.redis:
            return 0
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                await self.redis.delete(*keys)
            return len(keys)
        except Exception:
            return 0


cache = CacheManager()
