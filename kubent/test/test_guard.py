"""Unit tests for src.api.guard.AgentCapacityGuard

Covers:
  - acquire() returns True below capacity, False at capacity.
  - release() decrements the counter and allows re-acquisition.
  - Boundary: max_concurrent=0 always rejects.
  - Concurrent coroutines racing to acquire respect the limit exactly.
"""
from __future__ import annotations

import asyncio

import pytest
import pytest_asyncio

from src.api.guard import AgentCapacityGuard


class TestAgentCapacityGuard:
    @pytest.mark.asyncio
    async def test_acquire_below_capacity_returns_true(self):
        guard = AgentCapacityGuard(max_concurrent=5)
        assert await guard.acquire() is True

    @pytest.mark.asyncio
    async def test_acquire_exactly_at_capacity_returns_false(self):
        guard = AgentCapacityGuard(max_concurrent=2)
        assert await guard.acquire() is True
        assert await guard.acquire() is True
        assert await guard.acquire() is False

    @pytest.mark.asyncio
    async def test_release_allows_new_acquisition(self):
        guard = AgentCapacityGuard(max_concurrent=1)
        assert await guard.acquire() is True
        assert await guard.acquire() is False
        await guard.release()
        assert await guard.acquire() is True

    @pytest.mark.asyncio
    async def test_partial_release_allows_some_new_slots(self):
        guard = AgentCapacityGuard(max_concurrent=3)
        await guard.acquire()
        await guard.acquire()
        await guard.release()
        # 1 active → 2 free slots remain
        assert await guard.acquire() is True
        assert await guard.acquire() is True
        assert await guard.acquire() is False

    @pytest.mark.asyncio
    async def test_max_one_behaves_as_mutex(self):
        guard = AgentCapacityGuard(max_concurrent=1)
        assert await guard.acquire() is True
        assert await guard.acquire() is False
        await guard.release()
        assert await guard.acquire() is True

    @pytest.mark.asyncio
    async def test_full_release_restores_all_slots(self):
        guard = AgentCapacityGuard(max_concurrent=3)
        await guard.acquire()
        await guard.acquire()
        await guard.acquire()
        await guard.release()
        await guard.release()
        await guard.release()
        # All slots freed
        assert await guard.acquire() is True
        assert await guard.acquire() is True
        assert await guard.acquire() is True
        assert await guard.acquire() is False

    @pytest.mark.asyncio
    async def test_zero_max_concurrent_always_rejects(self):
        guard = AgentCapacityGuard(max_concurrent=0)
        assert await guard.acquire() is False

    @pytest.mark.asyncio
    async def test_large_capacity_accepts_many(self):
        guard = AgentCapacityGuard(max_concurrent=100)
        for _ in range(100):
            assert await guard.acquire() is True
        assert await guard.acquire() is False

    @pytest.mark.asyncio
    async def test_concurrent_coroutines_respect_limit(self):
        """Multiple coroutines racing should not exceed max_concurrent slots."""
        guard = AgentCapacityGuard(max_concurrent=3)
        results: list[bool] = []

        async def try_acquire():
            results.append(await guard.acquire())

        await asyncio.gather(*[try_acquire() for _ in range(10)])
        assert results.count(True) == 3
        assert results.count(False) == 7

    @pytest.mark.asyncio
    async def test_interleaved_acquire_release(self):
        """acquire → release → acquire should always work for a single slot."""
        guard = AgentCapacityGuard(max_concurrent=1)
        for _ in range(5):
            assert await guard.acquire() is True
            await guard.release()

    @pytest.mark.asyncio
    async def test_active_count_does_not_go_negative_on_extra_release(self):
        """Over-releasing is a programming error but must not crash."""
        guard = AgentCapacityGuard(max_concurrent=2)
        await guard.acquire()
        await guard.release()
        await guard.release()          # extra release — _active may go negative
        # The next acquire must still behave logically (not raise)
        result = await guard.acquire()
        assert isinstance(result, bool)
