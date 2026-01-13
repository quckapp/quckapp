import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import timedelta

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class MLCache:
    """Caching service for ML model predictions"""

    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self.enabled = False
        self.default_ttl = int(os.getenv("CACHE_TTL_SECONDS", 3600))  # 1 hour default

        # TTL by prediction type
        self.ttl_config = {
            "sentiment": 3600,  # 1 hour
            "moderation": 3600,  # 1 hour
            "language": 86400,  # 24 hours (language rarely changes)
            "entities": 3600,  # 1 hour
            "summary": 7200,  # 2 hours
            "embeddings": 86400,  # 24 hours
            "smart_reply": 300,  # 5 minutes (context-dependent)
        }

    async def initialize(self):
        """Initialize Redis connection"""
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_password = os.getenv("REDIS_PASSWORD", None)
        redis_db = int(os.getenv("REDIS_DB", 9))

        try:
            self.client = redis.Redis(
                host=redis_host,
                port=redis_port,
                password=redis_password,
                db=redis_db,
                decode_responses=True,
            )
            await self.client.ping()
            self.enabled = True
            logger.info(f"Redis cache connected: {redis_host}:{redis_port}")
        except Exception as e:
            logger.warning(f"Redis cache not available: {e}")
            self.enabled = False

    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()

    def _generate_key(self, prediction_type: str, input_data: str) -> str:
        """Generate cache key from prediction type and input"""
        # Hash the input for consistent key length
        input_hash = hashlib.sha256(input_data.encode()).hexdigest()[:16]
        return f"ml:cache:{prediction_type}:{input_hash}"

    async def get(self, prediction_type: str, input_data: str) -> Optional[Dict[str, Any]]:
        """Get cached prediction"""
        if not self.enabled:
            return None

        try:
            key = self._generate_key(prediction_type, input_data)
            cached = await self.client.get(key)

            if cached:
                logger.debug(f"Cache hit for {prediction_type}")
                return json.loads(cached)

            logger.debug(f"Cache miss for {prediction_type}")
            return None

        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None

    async def set(
        self,
        prediction_type: str,
        input_data: str,
        result: Dict[str, Any],
        ttl: Optional[int] = None,
    ):
        """Cache prediction result"""
        if not self.enabled:
            return

        try:
            key = self._generate_key(prediction_type, input_data)
            ttl = ttl or self.ttl_config.get(prediction_type, self.default_ttl)

            await self.client.setex(
                key,
                ttl,
                json.dumps(result),
            )
            logger.debug(f"Cached {prediction_type} result with TTL {ttl}s")

        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    async def delete(self, prediction_type: str, input_data: str):
        """Delete cached prediction"""
        if not self.enabled:
            return

        try:
            key = self._generate_key(prediction_type, input_data)
            await self.client.delete(key)
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")

    async def clear_type(self, prediction_type: str):
        """Clear all cached predictions of a type"""
        if not self.enabled:
            return

        try:
            pattern = f"ml:cache:{prediction_type}:*"
            cursor = 0
            deleted = 0

            while True:
                cursor, keys = await self.client.scan(cursor, match=pattern, count=100)
                if keys:
                    await self.client.delete(*keys)
                    deleted += len(keys)
                if cursor == 0:
                    break

            logger.info(f"Cleared {deleted} cached {prediction_type} predictions")

        except Exception as e:
            logger.warning(f"Cache clear error: {e}")

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled:
            return {"enabled": False}

        try:
            info = await self.client.info("stats")

            # Count keys by type
            type_counts = {}
            for pred_type in self.ttl_config.keys():
                pattern = f"ml:cache:{pred_type}:*"
                cursor = 0
                count = 0
                while True:
                    cursor, keys = await self.client.scan(cursor, match=pattern, count=100)
                    count += len(keys)
                    if cursor == 0:
                        break
                type_counts[pred_type] = count

            return {
                "enabled": True,
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "keys_by_type": type_counts,
                "total_keys": sum(type_counts.values()),
            }

        except Exception as e:
            return {"enabled": True, "error": str(e)}


# Global cache instance
_cache: Optional[MLCache] = None


async def get_cache() -> MLCache:
    """Get or create cache instance"""
    global _cache
    if _cache is None:
        _cache = MLCache()
        await _cache.initialize()
    return _cache


async def close_cache():
    """Close cache connection"""
    global _cache
    if _cache:
        await _cache.close()
        _cache = None
