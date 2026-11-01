"""
LLM Response Cache
Caches common responses to reduce LLM inference costs
"""

import hashlib
import json
from typing import Optional, Dict
from datetime import datetime, timedelta
from loguru import logger
import redis.asyncio as redis
from config import settings


class ResponseCache:
    """
    Caches LLM responses based on user input and context
    Reduces redundant LLM calls for common queries
    """

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.cache_ttl = 3600  # 1 hour TTL
        self.enabled = True

    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
            )
            await self.redis_client.ping()
            logger.info("Response cache initialized")
        except Exception as e:
            logger.warning(f"Response cache disabled: {e}")
            self.enabled = False
            self.redis_client = None

    def _generate_cache_key(self, user_input: str, context_hash: str) -> str:
        """Generate cache key from user input and context"""
        # Normalize input (lowercase, strip whitespace)
        normalized = user_input.lower().strip()
        
        # Create hash of input + context
        cache_string = f"{normalized}:{context_hash}"
        cache_hash = hashlib.md5(cache_string.encode()).hexdigest()
        
        return f"llm_cache:{cache_hash}"

    async def get(self, user_input: str, context_hash: str) -> Optional[str]:
        """Get cached response if available"""
        if not self.enabled or not self.redis_client:
            return None

        try:
            cache_key = self._generate_cache_key(user_input, context_hash)
            cached = await self.redis_client.get(cache_key)
            
            if cached:
                logger.debug(f"Cache hit for: {user_input[:50]}")
                return cached
            
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None

    async def set(self, user_input: str, context_hash: str, response: str):
        """Cache response"""
        if not self.enabled or not self.redis_client:
            return

        try:
            cache_key = self._generate_cache_key(user_input, context_hash)
            await self.redis_client.setex(
                cache_key,
                self.cache_ttl,
                response,
            )
            logger.debug(f"Cached response for: {user_input[:50]}")
        except Exception as e:
            logger.error(f"Cache set error: {e}")

    async def invalidate(self, pattern: str = "*"):
        """Invalidate cache entries matching pattern"""
        if not self.enabled or not self.redis_client:
            return

        try:
            keys = await self.redis_client.keys(f"llm_cache:{pattern}")
            if keys:
                await self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries")
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")

    async def get_stats(self) -> Dict:
        """Get cache statistics"""
        if not self.enabled or not self.redis_client:
            return {"enabled": False}

        try:
            keys = await self.redis_client.keys("llm_cache:*")
            return {
                "enabled": True,
                "total_entries": len(keys),
                "ttl_seconds": self.cache_ttl,
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"enabled": False, "error": str(e)}
