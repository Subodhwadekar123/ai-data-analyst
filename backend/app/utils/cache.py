"""
AI Data Analyst - In-Memory Cache
====================================
Simple TTL-based in-memory cache for dataset analysis results.
Prevents redundant computation on repeated requests.
"""

import time
import threading
from typing import Any, Optional
from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class TTLCache:
    """
    Thread-safe in-memory cache with TTL expiration.
    Used to cache expensive analysis results.
    """

    def __init__(self, ttl_seconds: int = 3600):
        self._cache: dict[str, dict] = {}
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a cached value if it hasn't expired."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            if time.time() > entry["expires_at"]:
                del self._cache[key]
                logger.debug(f"Cache expired for key: {key}")
                return None
            logger.debug(f"Cache hit for key: {key}")
            return entry["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store a value in the cache with optional custom TTL."""
        with self._lock:
            expiry = time.time() + (ttl or self._ttl)
            self._cache[key] = {"value": value, "expires_at": expiry}
            logger.debug(f"Cached value for key: {key}")

    def delete(self, key: str) -> None:
        """Remove a specific key from the cache."""
        with self._lock:
            self._cache.pop(key, None)

    def clear_dataset(self, dataset_id: str) -> None:
        """Remove all cache entries related to a specific dataset."""
        with self._lock:
            keys_to_delete = [k for k in self._cache if k.startswith(f"{dataset_id}:")]
            for key in keys_to_delete:
                del self._cache[key]
            if keys_to_delete:
                logger.info(f"Cleared {len(keys_to_delete)} cache entries for dataset {dataset_id}")

    def clear_all(self) -> None:
        """Clear the entire cache."""
        with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")

    @property
    def size(self) -> int:
        """Return the number of cached entries."""
        return len(self._cache)


# Global cache instance
analysis_cache = TTLCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
