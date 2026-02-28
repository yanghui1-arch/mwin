"""Redis connection
Through set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` to create a 
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from redis import ConnectionPool, Redis


@dataclass(frozen=True, slots=True)
class RedisConfig:
    """Immutable Redis connection configuration.

    Reads from environment variables with safe defaults for local development.
    """

    host: str = os.getenv("REDIS_HOST", "localhost")
    port: int = int(os.getenv("REDIS_PORT", "6379"))
    password: str | None = os.getenv("REDIS_PASSWORD")
    db: int = int(os.getenv("REDIS_DB", "0"))

    # Connection pool
    max_connections: int = int(os.getenv("REDIS_MAX_CONNECTIONS", "20"))

    # Timeouts (seconds)
    socket_timeout: float = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
    socket_connect_timeout: float = float(
        os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "3.0")
    )

    # Health check interval (seconds, 0 = disabled)
    health_check_interval: int = int(
        os.getenv("REDIS_HEALTH_CHECK_INTERVAL", "30")
    )

    # Wire encryption
    ssl: bool = os.getenv("REDIS_SSL", "false").lower() == "true"

    # Retry on timeout
    retry_on_timeout: bool = True

    # Key prefix to avoid collision across services
    key_prefix: str = os.getenv("REDIS_KEY_PREFIX", "kubent:")

    def build_url(self, db_override: int | None = None) -> str:
        """Build a Redis URL string (e.g. for Celery broker/backend).

        Args:
            db_override: Use a different db index instead of ``self.db``.
        """
        scheme = "rediss" if self.ssl else "redis"
        credentials = f":{self.password}@" if self.password else ""
        db = db_override if db_override is not None else self.db
        return f"{scheme}://{credentials}{self.host}:{self.port}/{db}"


_config = RedisConfig()
_pool: ConnectionPool | None = None


def init_redis_pool() -> ConnectionPool:
    """Create the shared connection pool.

    Must be called once during application startup (FastAPI lifespan,
    Celery worker_init, etc.) before any ``get_redis_pool`` call.

    Raises:
        RuntimeError: If the pool has already been initialised.
    """
    global _pool
    if _pool is not None:
        raise RuntimeError(
            "Redis pool is already initialised. "
            "Call close_redis_pool() first if you need to re-initialise."
        )
    _pool = ConnectionPool(
        host=_config.host,
        port=_config.port,
        password=_config.password,
        db=_config.db,
        max_connections=_config.max_connections,
        socket_timeout=_config.socket_timeout,
        socket_connect_timeout=_config.socket_connect_timeout,
        health_check_interval=_config.health_check_interval,
        retry_on_timeout=_config.retry_on_timeout,
        decode_responses=True,
    )
    return _pool

def close_redis_pool() -> None:
    """Drain the pool and release all connections.

    Safe to call even if the pool was never created.
    """
    global _pool
    if _pool is not None:
        _pool.disconnect()
        _pool = None


def get_redis_pool() -> ConnectionPool:
    """Return the shared connection pool.

    Raises:
        RuntimeError: If ``init_redis_pool`` has not been called yet.
    """
    if _pool is None:
        raise RuntimeError(
            "Redis pool is not initialised. "
            "Call init_redis_pool() during application startup."
        )
    return _pool


def get_redis_client() -> Redis:
    """Return a Redis client backed by the shared connection pool."""
    return Redis(connection_pool=get_redis_pool())

def get_redis_config() -> RedisConfig:
    """Expose the module-level config (read-only via frozen dataclass)."""
    return _config
