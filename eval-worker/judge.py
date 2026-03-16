"""
LLM-as-judge: builds prompts, calls the model, parses the score.
Each call is guarded by settings.judge_timeout_seconds.
"""
import asyncio
import json
import logging

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.judge_api_key,
            base_url=settings.judge_api_base,
        )
    return _client


# ── Prompt templates ───────────────────────────────────────────────────────────

_STEP_TEMPLATE = """\
You are evaluating a single LLM call inside an AI agent system.

Evaluation criterion: {name}
{description_line}
Scoring guide:
{judge_prompt}

Score range: {score_min} (worst) to {score_max} (best)

=== Input sent to the model ===
{input}

=== Model output ===
{output}

Reply with ONLY valid JSON, no markdown fences:
{{"score": <number within range>, "reasoning": "<one concise sentence>"}}"""

_TRACE_TEMPLATE = """\
You are evaluating an AI agent's overall performance on a complete task.

Evaluation criterion: {name}
{description_line}
Scoring guide:
{judge_prompt}

Score range: {score_min} (worst) to {score_max} (best)

=== Task input ===
{trace_input}

=== Agent final output ===
{trace_output}

=== Step summary ({step_count} steps) ===
{steps_summary}

Reply with ONLY valid JSON, no markdown fences:
{{"score": <number within range>, "reasoning": "<one concise sentence>"}}"""


# ── Public API ─────────────────────────────────────────────────────────────────

async def judge_step(step: dict, metric: dict) -> dict:
    """Call LLM judge for a single step. Returns {"score": float, "reasoning": str}."""
    prompt = _STEP_TEMPLATE.format(
        name=metric["name"],
        description_line=f"Description: {metric['description']}" if metric.get("description") else "",
        judge_prompt=metric.get("judge_prompt") or "Evaluate the quality and correctness of the output.",
        score_min=metric["score_range_min"],
        score_max=metric["score_range_max"],
        input=_dump(step.get("input"))[:4000],
        output=_dump(step.get("output"))[:4000],
    )
    return await _call_judge(prompt)


async def judge_trace(trace: dict, steps: list[dict], metric: dict) -> dict:
    """Call LLM judge for a completed trace. Returns {"score": float, "reasoning": str}."""
    steps_summary = "\n".join(
        f"  [{i + 1}] type={s.get('step_type')}  model={s.get('model')}  "
        f"has_error={bool(s.get('error_info'))}"
        for i, s in enumerate(steps)
    )
    prompt = _TRACE_TEMPLATE.format(
        name=metric["name"],
        description_line=f"Description: {metric['description']}" if metric.get("description") else "",
        judge_prompt=metric.get("judge_prompt") or "Evaluate the overall task completion quality.",
        score_min=metric["score_range_min"],
        score_max=metric["score_range_max"],
        trace_input=_dump(trace.get("input"))[:3000],
        trace_output=_dump(trace.get("output"))[:3000],
        step_count=len(steps),
        steps_summary=steps_summary[:2000],
    )
    return await _call_judge(prompt)


# ── Internal helpers ───────────────────────────────────────────────────────────

async def _call_judge(prompt: str) -> dict:
    response = await asyncio.wait_for(
        _get_client().chat.completions.create(
            model=settings.judge_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=256,
        ),
        timeout=settings.judge_timeout_seconds,
    )
    raw = response.choices[0].message.content.strip()

    # Strip accidental markdown fences
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]

    result = json.loads(raw.strip())
    return {
        "score": float(result["score"]),
        "reasoning": str(result["reasoning"]),
    }


def _dump(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, indent=2)
