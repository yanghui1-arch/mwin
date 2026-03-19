"""
Main worker loop.

Key design decisions:
- asyncpg connection pool: connections are acquired only for DB operations,
  never held during LLM calls.
- process_job has two distinct phases:
    Phase A  (quick, holds a pool connection): claim job, fetch data
    Phase B  (slow, no DB connection): call LLM judge — may take seconds
    Phase C  (quick, holds a pool connection): write scores, mark done/failed
- SIGTERM / SIGINT: stops accepting new work, waits for in-flight jobs to finish,
  then closes the pool cleanly.
- On startup: resets any jobs stuck in 'processing' from a previous crash.
- LISTEN connection: auto-reconnects on drop; periodic 60 s drain is a safety net
  so no notifications are permanently lost even during a reconnect window.
"""
import asyncio
import contextlib
import logging
import signal
import sys
from uuid import UUID

import asyncpg

import db
import judge
from config import settings

logger = logging.getLogger(__name__)


# ── Job processing ─────────────────────────────────────────────────────────────

async def process_job(pool: asyncpg.Pool, job_id: UUID) -> None:
    # ── Phase A: claim + fetch (quick DB round-trip, connection released after) ──
    async with pool.acquire() as conn:
        job = await db.claim_job(conn, job_id)
        if job is None:
            return  # already claimed by another instance or retry limit reached

        if job["job_type"] == "step":
            subject = await db.fetch_step(conn, job["step_id"])
            if subject is None:
                await db.mark_job_failed(conn, job_id, f"step {job['step_id']} not found")
                return
        elif job["job_type"] == "trace":
            subject = await db.fetch_trace(conn, job["trace_id"])
            if subject is None:
                await db.mark_job_failed(conn, job_id, f"trace {job['trace_id']} not found")
                return
            subject["steps"] = await db.fetch_steps_for_trace(conn, job["trace_id"])
        else:
            await db.mark_job_failed(conn, job_id, f"unknown job_type: {job['job_type']}")
            return

        metrics = await db.fetch_metrics(conn)

    if not metrics:
        logger.debug("no global eval metrics defined — skipping job %s", job_id)
        async with pool.acquire() as conn:
            await db.mark_job_done(conn, job_id)
        return

    # ── Phase B: LLM judge calls (slow, no DB connection held) ─────────────────
    scores: list[dict] = []
    try:
        for metric in metrics:
            if job["job_type"] == "step":
                result = await judge.judge_step(subject, metric)
                scores.append(dict(
                    step_id=job["step_id"],
                    trace_id=job["trace_id"],
                    prompt_version=job.get("prompt_version"),
                    eval_metric_id=metric["id"],
                    score=result["score"],
                    reasoning=result["reasoning"],
                ))
            else:
                result = await judge.judge_trace(subject, subject["steps"], metric)
                scores.append(dict(
                    step_id=None,
                    trace_id=job["trace_id"],
                    prompt_version=None,
                    eval_metric_id=metric["id"],
                    score=result["score"],
                    reasoning=result["reasoning"],
                ))
            logger.debug(
                "judge: %s job %s  metric=%s  score=%s",
                job["job_type"], job_id, metric["name"], result["score"],
            )
    except asyncio.TimeoutError:
        error = f"LLM judge timed out after {settings.judge_timeout_seconds}s"
        logger.warning("eval_job %s: %s", job_id, error)
        async with pool.acquire() as conn:
            await db.mark_job_failed(conn, job_id, error)
        return
    except Exception as exc:
        logger.exception("eval_job %s LLM phase failed: %s", job_id, exc)
        async with pool.acquire() as conn:
            await db.mark_job_failed(conn, job_id, str(exc))
        return

    # ── Phase C: write results (quick DB round-trip, connection released after) ──
    async with pool.acquire() as conn:
        for s in scores:
            await db.insert_score(conn, **s)
        await db.mark_job_done(conn, job_id)

    logger.info("eval_job %s done  (type=%s, scores=%d)", job_id, job["job_type"], len(scores))


# ── Drain & scheduling ─────────────────────────────────────────────────────────

async def _guarded(
    pool: asyncpg.Pool,
    semaphore: asyncio.Semaphore,
    job_id: UUID,
) -> None:
    async with semaphore:
        await process_job(pool, job_id)


async def drain(pool: asyncpg.Pool, semaphore: asyncio.Semaphore) -> None:
    """Process all pending/retryable jobs — startup sweep and periodic safety net."""
    async with pool.acquire() as conn:
        jobs = await db.fetch_pending_jobs(conn)

    if not jobs:
        return

    logger.info("Draining %d pending job(s)", len(jobs))
    await asyncio.gather(*[
        _guarded(pool, semaphore, UUID(str(j["id"]))) for j in jobs
    ])


# ── LISTEN connection with auto-reconnect ──────────────────────────────────────

async def _maintain_listener(
    pool: asyncpg.Pool,
    semaphore: asyncio.Semaphore,
    shutdown: asyncio.Event,
) -> None:
    """
    Keep a dedicated LISTEN connection alive.
    On any drop (Postgres restart, network blip, idle timeout), wait 5 s and
    reconnect. The 60 s periodic drain in run() ensures no jobs are permanently
    missed during a reconnect window.
    """
    while not shutdown.is_set():
        conn: asyncpg.Connection | None = None
        try:
            conn = await asyncpg.connect(settings.database_url)

            async def on_notify(_conn, _pid, _channel, payload: str) -> None:
                if not shutdown.is_set():
                    asyncio.create_task(_guarded(pool, semaphore, UUID(payload)))

            await conn.add_listener("eval_job_created", on_notify)
            logger.info("LISTEN connection established")

            # Block here until the connection closes or shutdown is requested.
            # asyncpg raises asyncpg.InterfaceError / OSError on unexpected close.
            await shutdown.wait()

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("LISTEN connection lost: %s — reconnecting in 5 s", exc)
            await asyncio.sleep(5)
        finally:
            if conn is not None:
                with contextlib.suppress(Exception):
                    await conn.close()

    logger.debug("Listener loop exiting")


# ── Entry point ────────────────────────────────────────────────────────────────

async def run() -> None:
    shutdown = asyncio.Event()

    if sys.platform == "win32":
        # loop.add_signal_handler is Unix-only; use signal.signal on Windows
        signal.signal(signal.SIGINT, lambda s, f: shutdown.set())
        signal.signal(signal.SIGTERM, lambda s, f: shutdown.set())
    else:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, shutdown.set)

    pool = await db.create_pool()
    semaphore = asyncio.Semaphore(settings.worker_concurrency)

    # 1. Reset jobs stuck in 'processing' from a previous crash / SIGKILL
    async with pool.acquire() as conn:
        reset_count = await db.reset_stuck_jobs(conn)
    if reset_count:
        logger.info("Reset %d stuck processing job(s) to pending", reset_count)

    # 2. Drain jobs that arrived while the worker was offline
    await drain(pool, semaphore)

    # 3. Start the self-healing LISTEN loop as a background task
    listener_task = asyncio.create_task(
        _maintain_listener(pool, semaphore, shutdown)
    )

    # 4. Main loop: periodic drain every 60 s, exit on shutdown signal
    while not shutdown.is_set():
        try:
            await asyncio.wait_for(shutdown.wait(), timeout=60)
        except asyncio.TimeoutError:
            await drain(pool, semaphore)

    # 5. Graceful shutdown
    logger.info("Shutdown signal received — stopping gracefully")
    listener_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await listener_task

    # Wait for all in-flight jobs by acquiring every semaphore slot
    logger.info("Waiting for in-flight jobs to finish...")
    for _ in range(settings.worker_concurrency):
        await semaphore.acquire()

    await pool.close()
    logger.info("Eval worker stopped cleanly")
