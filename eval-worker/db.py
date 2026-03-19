"""
All direct PostgreSQL access for the eval worker.
Uses asyncpg connection pool — connections are never held during LLM calls.
"""
import json
from typing import Optional
from uuid import UUID

import asyncpg

from config import settings


async def _init_conn(conn: asyncpg.Connection) -> None:
    """Called by the pool for every new connection — registers JSONB codecs."""
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )
    await conn.set_type_codec(
        "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        settings.database_url,
        min_size=1,
        max_size=settings.worker_concurrency + 2,  # +2 for drain queries / listener setup
        init=_init_conn,
    )


# ── Job lifecycle ──────────────────────────────────────────────────────────────

async def claim_job(conn: asyncpg.Connection, job_id: UUID) -> Optional[dict]:
    """Atomically move a pending/failed job to 'processing'. Returns the row or None."""
    row = await conn.fetchrow(
        """
        UPDATE eval_job
           SET status = 'processing', updated_at = now()
         WHERE id = $1
           AND status IN ('pending', 'failed')
           AND retry_count < 3
        RETURNING id, job_type, step_id, trace_id, project_id, prompt_version, retry_count
        """,
        job_id,
    )
    return dict(row) if row else None


async def mark_job_done(conn: asyncpg.Connection, job_id: UUID) -> None:
    await conn.execute(
        "UPDATE eval_job SET status = 'done', updated_at = now() WHERE id = $1",
        job_id,
    )


async def mark_job_failed(conn: asyncpg.Connection, job_id: UUID, error: str) -> None:
    await conn.execute(
        """
        UPDATE eval_job
           SET status      = 'failed',
               retry_count = retry_count + 1,
               error_msg   = $2,
               updated_at  = now()
         WHERE id = $1
        """,
        job_id,
        error[:2000],
    )


async def reset_stuck_jobs(conn: asyncpg.Connection) -> int:
    """
    On startup, move any jobs stuck in 'processing' back to 'pending'.
    They were abandoned mid-flight by a previous crash or SIGKILL.
    Only resets jobs older than 10 minutes to avoid racing a slow-but-alive worker.
    """
    result = await conn.execute(
        """
        UPDATE eval_job
           SET status     = 'pending',
               error_msg  = 'reset: found processing on worker startup',
               updated_at = now()
         WHERE status = 'processing'
           AND updated_at < now() - INTERVAL '10 minutes'
        """
    )
    # asyncpg returns "UPDATE N" as a string
    count = int(result.split()[-1])
    return count


async def fetch_pending_jobs(conn: asyncpg.Connection) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT id, job_type, step_id, trace_id, project_id, prompt_version
          FROM eval_job
         WHERE status IN ('pending', 'failed')
           AND retry_count < 3
         ORDER BY created_at
         LIMIT 100
        """
    )
    return [dict(r) for r in rows]


# ── Data fetching ──────────────────────────────────────────────────────────────

async def fetch_step(conn: asyncpg.Connection, step_id: UUID) -> Optional[dict]:
    """Fetch step row. 'type' is the actual column name in the step table."""
    row = await conn.fetchrow(
        "SELECT id, input, output, model, type AS step_type FROM step WHERE id = $1",
        step_id,
    )
    return dict(row) if row else None


async def fetch_trace(conn: asyncpg.Connection, trace_id: UUID) -> Optional[dict]:
    row = await conn.fetchrow(
        "SELECT id, input, output, project_id FROM trace WHERE id = $1",
        trace_id,
    )
    return dict(row) if row else None


async def fetch_steps_for_trace(conn: asyncpg.Connection, trace_id: UUID) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT type AS step_type, model, input, output, error_info
          FROM step
         WHERE trace_id = $1
         ORDER BY start_time
        """,
        trace_id,
    )
    return [dict(r) for r in rows]


async def fetch_metrics(conn: asyncpg.Connection) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT id, name, description, judge_prompt,
               score_range_min, score_range_max
          FROM eval_metric
        """
    )
    return [dict(r) for r in rows]


# ── Score writing ──────────────────────────────────────────────────────────────

async def insert_score(
    conn: asyncpg.Connection,
    *,
    step_id: Optional[UUID],
    trace_id: UUID,
    prompt_version: Optional[str],
    eval_metric_id: UUID,
    score: float,
    reasoning: str,
) -> None:
    await conn.execute(
        """
        INSERT INTO eval_score
            (id, step_id, trace_id, prompt_version, eval_metric_id,
             evaluator_type, score, reasoning)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'llm', $5, $6)
        """,
        step_id,
        trace_id,
        prompt_version,
        eval_metric_id,
        score,
        reasoning,
    )
