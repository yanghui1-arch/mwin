import asyncio


class AgentCapacityGuard:
    """Manages concurrent SSE agent run slots with an async-safe lock.
    If the number of agents is large they will occupy all of thread workers. (Agent is put into ThreadPoolExecutor to run work.)
    So we need AgentCapacityGuard to control the number of running agents based on our server cpu cores.
    """

    def __init__(self, max_concurrent: int):
        self._max = max_concurrent
        self._active = 0
        self._lock = asyncio.Lock()

    async def acquire(self) -> bool:
        """Try to claim a slot. Returns False if already at capacity."""
        async with self._lock:
            if self._active >= self._max:
                return False
            self._active += 1
            return True

    async def release(self):
        async with self._lock:
            self._active -= 1
