import time
from collections import OrderedDict
from typing import Dict, Optional
from datetime import datetime

import docker
from pydantic import BaseModel

from .core import DockerSandbox, DockerSandboxConfig
from .client import get_docker_client


class SandboxPoolItem(BaseModel):
    """Represents a sandbox instance in the pool with metadata."""

    model_config = {"arbitrary_types_allowed": True}

    sandbox: DockerSandbox
    agent_name: str
    session_id: str
    created_at: float
    last_accessed: float
    access_count: int = 0

    def update_access(self):
        """Update the last access time and increment access count."""
        self.last_accessed = time.time()
        self.access_count += 1


class SandboxManager:
    """
    Manages a pool of Docker sandboxes with LRU eviction policy.

    Features:
    - Pool starts empty and grows on demand
    - When capacity is reached, removes the least recently used sandbox
    - Tracks sandbox usage and access patterns
    - Uses composite key (agent_name + session_id) for identification
    """

    def __init__(
        self,
        capacity: int = 10,
        docker_client: docker.DockerClient | None = None,
    ):
        """
        Initialize the sandbox manager.

        Args:
            capacity: Maximum number of sandboxes in the pool
            docker_client: Docker client instance (uses get_docker_client() if not provided)
        """
        self.capacity = capacity
        self._pool: OrderedDict[str, SandboxPoolItem] = OrderedDict()
        self._docker_client = docker_client or get_docker_client()

    @staticmethod
    def _make_key(agent_name: str, session_id: str) -> str:
        """
        Create a composite key from agent_name and session_id.

        Args:
            agent_name: Name of the agent
            session_id: Session identifier

        Returns:
            Composite key string
        """
        return f"{agent_name}:{session_id}"

    def get_sandbox(
        self,
        agent_name: str,
        session_id: str,
        config: DockerSandboxConfig | None = None,
    ) -> DockerSandbox:
        """
        Get a sandbox from the pool. Creates a new one if it doesn't exist.

        Args:
            agent_name: Name of the agent
            session_id: Session identifier
            config: Configuration for creating a new sandbox (required if sandbox doesn't exist)

        Returns:
            DockerSandbox instance

        Raises:
            ValueError: If sandbox doesn't exist and no config is provided
        """
        key = self._make_key(agent_name, session_id)

        if key in self._pool:
            item = self._pool[key]
            item.update_access()
            self._pool.move_to_end(key)
            return item.sandbox

        if config is None:
            raise ValueError(
                f"Sandbox with agent_name='{agent_name}', session_id='{session_id}' "
                f"not found and no config provided"
            )

        if len(self._pool) >= self.capacity:
            self._evict_lru()

        sandbox = DockerSandbox(config=config, docker_client=self._docker_client)
        current_time = time.time()

        pool_item = SandboxPoolItem(
            sandbox=sandbox,
            agent_name=agent_name,
            session_id=session_id,
            created_at=current_time,
            last_accessed=current_time,
            access_count=1,
        )

        self._pool[key] = pool_item
        self._pool.move_to_end(key)

        return sandbox

    def mark_sandbox(self, agent_name: str, session_id: str) -> None:
        """
        Mark a sandbox as recently used (moves it to the end of LRU queue).

        Args:
            agent_name: Name of the agent
            session_id: Session identifier
        """
        key = self._make_key(agent_name, session_id)
        if key in self._pool:
            item = self._pool[key]
            item.update_access()
            self._pool.move_to_end(key)

    def remove_sandbox(self, agent_name: str, session_id: str) -> bool:
        """
        Remove a sandbox from the pool and close its container.

        Args:
            agent_name: Name of the agent
            session_id: Session identifier

        Returns:
            True if sandbox was removed, False if it didn't exist
        """
        key = self._make_key(agent_name, session_id)
        if key not in self._pool:
            return False

        pool_item = self._pool.pop(key)
        pool_item.sandbox.close()

        return True

    def _evict_lru(self) -> None:
        """Evict the least recently used sandbox from the pool."""
        if not self._pool:
            return

        lru_key, pool_item = self._pool.popitem(last=False)

        try:
            pool_item.sandbox.close()
        except Exception as e:
            print(f"Error evicting sandbox {lru_key}: {e}")

    def get_pool_info(self) -> Dict[str, dict]:
        """
        Get information about all sandboxes in the pool.

        Returns:
            Dictionary mapping composite key to sandbox metadata
        """
        info = {}
        for key, item in self._pool.items():
            info[key] = {
                "agent_name": item.agent_name,
                "session_id": item.session_id,
                "created_at": datetime.fromtimestamp(item.created_at).isoformat(),
                "last_accessed": datetime.fromtimestamp(item.last_accessed).isoformat(),
                "access_count": item.access_count,
                "idle_seconds": time.time() - item.last_accessed,
            }
        return info

    def clear_pool(self) -> int:
        """
        Remove all sandboxes from the pool.

        Returns:
            Number of sandboxes removed
        """
        count = len(self._pool)
        keys = list(self._pool.keys())

        for key in keys:
            agent_name, session_id = key.split(":", 1)
            self.remove_sandbox(agent_name, session_id)

        return count

    def get_pool_size(self) -> int:
        """Get the current number of sandboxes in the pool."""
        return len(self._pool)

    def is_pool_full(self) -> bool:
        """Check if the pool has reached its capacity."""
        return len(self._pool) >= self.capacity

    def has_sandbox(self, agent_name: str, session_id: str) -> bool:
        """
        Check if a sandbox exists in the pool.

        Args:
            agent_name: Name of the agent
            session_id: Session identifier

        Returns:
            True if sandbox exists, False otherwise
        """
        key = self._make_key(agent_name, session_id)
        return key in self._pool


_sandbox_manager: Optional[SandboxManager] = None


def init_sandbox_manager(
    capacity: int = 10,
    docker_client: docker.DockerClient | None = None,
) -> SandboxManager:
    """
    Initialize a singleton SandboxManager.

    Args:
        capacity: Maximum number of sandboxes in the pool
        docker_client: Docker client instance

    Returns:
        SandboxManager instance
    """
    global _sandbox_manager

    if _sandbox_manager is not None:
        return _sandbox_manager

    _sandbox_manager = SandboxManager(
        capacity=capacity,
        docker_client=docker_client,
    )

    return _sandbox_manager


def get_sandbox_manager() -> SandboxManager:
    """
    Get the singleton SandboxManager instance.

    Returns:
        SandboxManager instance

    Raises:
        RuntimeError: If manager hasn't been initialized
    """
    if _sandbox_manager is None:
        raise RuntimeError(
            "Sandbox manager not initialized. "
            "Did you forget to call init_sandbox_manager() on startup?"
        )
    return _sandbox_manager
