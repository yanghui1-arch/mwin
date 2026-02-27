# Prompt Management & Evaluation — Requirements Document

> Status: Approved for implementation
> Date: 2026-02-27
> Participants: Project Owner, Claude (Architecture Partner)

---

## 1. Overview

### 1.1 Goal

Add prompt management and prompt evaluation capabilities to the AITrace platform. This enables any agent system tracked by mwin to version, deploy, and evaluate system prompts systematically.

### 1.2 Scope

This feature spans all four modules:

| Module | Role |
|--------|------|
| **mwin** (Python SDK) | Prompt resolution, caching, automatic linkage to steps |
| **java-backend** | Prompt CRUD API, step storage with prompt linkage, proxies evaluation queries |
| **aitrace-evaluator-backend** (NEW) | Async LLM-as-judge evaluation via Celery + Redis |
| **web** | Prompt editor, version management, evaluation display, human annotation |

### 1.3 Key Principles

- Prompt management serves **any external agent system** tracked by mwin, not only kubent
- Prompts are **versioned immutable artifacts** — edits create new versions, never mutate existing ones
- Labels are **mutable pointers** — one label points to exactly one version, can be reassigned without code changes
- User code changes are **minimal** — one optional parameter on the existing `@track` decorator
- No auto-creation of prompts — if prompt not found, warn but do not interrupt step/trace logging
- Evaluation runs **asynchronously** in background, never blocking the agent's execution
- All external queries go through **java-backend** — evaluator-backend is internal only

---

## 2. Database Design

Database: PostgreSQL 18

### 2.1 New Tables

#### 2.1.1 `prompt` — Prompt Identity

One row per logical prompt. Name is unique within a project.

```sql
CREATE TABLE prompt (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      BIGINT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(20) DEFAULT 'text',   -- 'text' | 'chat'
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, name)
);
```

#### 2.1.2 `prompt_version` — Immutable Version History

Every edit creates a new row. Versions are never mutated. Version is a free-form string to support team naming conventions (e.g. "0.1.1-b", "V1", "v-1.0").

```sql
CREATE TABLE prompt_version (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id       UUID NOT NULL,
    version         VARCHAR(50) NOT NULL,
    content         JSONB NOT NULL,                -- template with {placeholders}
    variables       JSONB DEFAULT '[]',            -- declared placeholder names, e.g. ["context", "project_name"]
    model_config    JSONB DEFAULT '{}',            -- temperature, model, max_tokens, etc.
    commit_message  TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(prompt_id, version)
);
```

**`content` format** — stores the original unformatted template:

```json
{
  "template": "Your name is Robin.\n\nCurrent time: {time}\nProject: {project_name}\n\n## Context\n{context}"
}
```

Template uses Python `str.format()` / f-string compatible `{variable}` syntax.

**`variables` format** — declares what placeholders exist:

```json
["time", "project_name", "context"]
```

This allows the web UI to render input fields for testing/previewing prompts.

#### 2.1.3 `prompt_label` — Mutable Label Pointer

One label points to exactly one version. Reassigning a label is a single row UPDATE.

```sql
CREATE TABLE prompt_label (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id         UUID NOT NULL,
    label             VARCHAR(100) NOT NULL,
    prompt_version_id UUID NOT NULL,
    deployed_by       UUID,
    deployed_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(prompt_id, label)
);
```

**Example state:**

| prompt (name) | label | → version | meaning |
|---------------|-------|-----------|---------|
| robin_system | production | 2.0 | live in production |
| robin_system | prod-test | 2.1 | small-scale production test |
| robin_system | staging | 2.2 | development/staging |

Promoting version 2.1 to production = UPDATE `prompt_label` SET `prompt_version_id` = (2.1's id) WHERE label = 'production'. Zero code change required.

#### 2.1.4 `eval_metric` — Evaluation Criteria

Defines what metrics are evaluated and how. Each metric has a judge prompt for automated evaluation.

```sql
CREATE TABLE eval_metric (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    judge_prompt    TEXT,                           -- system prompt for LLM judge
    score_range_min DECIMAL(7,2) DEFAULT 0,
    score_range_max DECIMAL(7,2) DEFAULT 5,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, name)
);
```

**Recommended default metrics:**

| Metric Name | Description |
|-------------|-------------|
| `task_completion` | Did the agent complete the user's requested task? |
| `relevance` | Is the response relevant to the input? |
| `coherence` | Is the response logically structured and consistent? |
| `actionability` | Can the user act on the agent's suggestions? |

#### 2.1.5 `eval_score` — Evaluation Results

Stores both machine-generated and human-generated scores.

```sql
CREATE TABLE eval_score (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id           UUID,
    trace_id          UUID,
    prompt_version_id UUID,                                  -- denormalized for fast aggregation
    eval_metric_id    UUID NOT NULL,
    evaluator_type    VARCHAR(20) NOT NULL,                   -- 'auto' | 'human'
    score             DECIMAL(7,2) NOT NULL,
    reasoning         TEXT,                                   -- judge explanation or human comment
    evaluated_by      UUID,                                   -- null for auto, user_id for human
    created_at        TIMESTAMPTZ DEFAULT now()
);
```

#### 2.1.6 `eval_annotation` — Human-Suggested Better Responses

Allows human evaluators to write what the ideal response should have been.

```sql
CREATE TABLE eval_annotation (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id         UUID NOT NULL,
    annotated_by    UUID NOT NULL,
    suggested_output TEXT,                                   -- ideal response
    comment         TEXT,                                    -- why this is better
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Modifications to Existing Tables

#### `step` table — Add prompt linkage column

```sql
ALTER TABLE step ADD COLUMN prompt_version_id UUID;
```

This column is nullable. Steps without prompt management continue to work unchanged.

---

## 3. mwin SDK Changes

### 3.1 New `prompt` Parameter on `@track`

The `prompt` parameter accepts two forms:

```python
# String — name only, defaults to label "production"
@track(prompt="my_system_prompt")

# Tuple of 2 — name + specific label
@track(prompt=("my_system_prompt", "staging"))
```

**Parsing logic:**

```python
def _parse_prompt_param(prompt) -> tuple[str, str]:
    """Returns (name, label)."""
    if isinstance(prompt, str):
        return (prompt, "production")
    elif isinstance(prompt, tuple) and len(prompt) == 2:
        return (prompt[0], prompt[1])
    raise ValueError(f"Invalid prompt parameter: {prompt}")
```

### 3.2 Resolution Behavior

When a decorated function is called:

1. Parse `prompt` parameter → `(name, label)`
2. Check local cache for `(project, name, label)` → `prompt_version_id`
3. **Cache hit** → use cached `prompt_version_id`
4. **Cache miss** → call java-backend API: `GET /api/v0/prompt/resolve?name={name}&label={label}&project={project}`
5. **API returns version_id** → cache it, attach to step context
6. **API returns not found** → log warning, continue without `prompt_version_id`
7. When `LogStepRequest` is built at function end, include `prompt_version_id` from context (or null)

### 3.3 Caching Strategy

```
Cache key:   (project_name, prompt_name, label)
Cache value: prompt_version_id
TTL:         5 minutes (configurable)
Storage:     In-memory dict (thread-safe)
```

- Cache is per-process, in-memory
- TTL ensures changes propagate within 5 minutes
- When a label is reassigned in the web UI, the new version takes effect after TTL expiry
- No cache invalidation push — simplicity over immediacy

### 3.4 `LogStepRequest` Change

```python
@dataclass
class LogStepRequest:
    # ... all existing fields unchanged ...
    prompt_version_id: Optional[str] = None  # NEW — nullable, backward compatible
```

### 3.5 Backward Compatibility

- `prompt` parameter is optional. Existing `@track()` calls work unchanged.
- If `prompt` is not provided, `prompt_version_id` is `None`. No DB lookup, no warning, zero overhead.
- New field on `LogStepRequest` defaults to `None`. Old backends that don't recognize it will ignore it (if using flexible deserialization) or need a minor update to accept the new field.

---

## 4. Java Backend Changes

### 4.1 New Entities & Repositories

Create JPA entities for all 6 new tables:

- `Prompt` entity
- `PromptVersion` entity
- `PromptLabel` entity
- `EvalMetric` entity
- `EvalScore` entity
- `EvalAnnotation` entity

### 4.2 New API Endpoints

#### Prompt Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v0/prompt` | Create a new prompt |
| GET | `/api/v0/prompt/{projectId}` | List all prompts for a project |
| GET | `/api/v0/prompt/{projectId}/{promptName}` | Get prompt detail with versions |
| DELETE | `/api/v0/prompt/{promptId}` | Delete a prompt |
| POST | `/api/v0/prompt/version` | Create a new version |
| GET | `/api/v0/prompt/version/{promptId}` | List versions for a prompt |
| GET | `/api/v0/prompt/resolve` | Resolve (name, label) → version_id (used by mwin) |
| POST | `/api/v0/prompt/label` | Create or update a label pointer |
| GET | `/api/v0/prompt/label/{promptId}` | List labels for a prompt |
| DELETE | `/api/v0/prompt/label/{labelId}` | Delete a label |

#### Evaluation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v0/eval/metric` | Create evaluation metric |
| GET | `/api/v0/eval/metric/{projectId}` | List metrics for a project |
| PUT | `/api/v0/eval/metric/{metricId}` | Update metric (e.g. judge prompt) |
| DELETE | `/api/v0/eval/metric/{metricId}` | Delete metric |
| POST | `/api/v0/eval/score` | Submit human evaluation score |
| GET | `/api/v0/eval/score/{stepId}` | Get all scores for a step |
| GET | `/api/v0/eval/score/aggregate` | Aggregate scores by prompt version |
| POST | `/api/v0/eval/annotation` | Submit human annotation (better response) |
| GET | `/api/v0/eval/annotation/{stepId}` | Get annotations for a step |

#### Step Logging Update

- `POST /api/v0/log/step` — accept new optional field `prompt_version_id` in request body, store on `step` row.

### 4.3 Evaluator Integration

After a step is saved (in `POST /api/v0/log/step`), if the step has a `prompt_version_id`:

1. Publish a message to **Redis** with the step_id
2. The evaluator-backend's Celery worker picks it up asynchronously

The java-backend uses a Redis client (e.g. Jedis/Lettuce) to publish the evaluation task.

### 4.4 Aggregation Query

Key query for comparing prompt versions:

```sql
SELECT
    pv.version,
    em.name AS metric,
    es.evaluator_type,
    ROUND(AVG(es.score), 2) AS avg_score,
    COUNT(*) AS sample_size
FROM eval_score es
JOIN prompt_version pv ON pv.id = es.prompt_version_id
JOIN eval_metric em ON em.id = es.eval_metric_id
WHERE pv.prompt_id = :promptId
GROUP BY pv.version, em.name, es.evaluator_type
ORDER BY pv.version, em.name;
```

Exposed via `GET /api/v0/eval/score/aggregate?promptId={id}`.

---

## 5. Evaluator Backend (NEW Project)

### 5.1 Project Identity

- **Name**: `aitrace-evaluator-backend`
- **Location**: `backend/aitrace-evaluator-backend/`
- **Language**: Python
- **This is a separate, independent project**

### 5.2 Tech Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Framework | FastAPI | Internal API, consistent with kubent |
| Task Queue | Celery | Mainstream async task processing |
| Message Broker | Redis | Lightweight, pairs with Celery |
| LLM Calls | LiteLLM | Multi-provider support, already used in kubent |
| DB Access | SQLAlchemy (async) | Consistent with kubent patterns |
| Config | TOML | Consistent with kubent |

### 5.3 Project Structure

```
backend/aitrace-evaluator-backend/
├── pyproject.toml
├── config.toml
├── src/
│   ├── main.py                    # FastAPI app (internal API)
│   ├── config.py                  # TOML config loader
│   ├── celery_app.py              # Celery configuration, Redis broker
│   ├── worker/
│   │   └── tasks.py               # Celery tasks: evaluate_step
│   ├── judge/
│   │   └── engine.py              # LLM judge logic
│   ├── models/
│   │   ├── eval_metric.py         # SQLAlchemy model
│   │   └── eval_score.py          # SQLAlchemy model
│   └── repository/
│       └── eval_repository.py     # DB read/write
```

### 5.4 Evaluation Flow

```
java-backend (POST /log/step)
    │
    │  step has prompt_version_id?
    │  yes → publish to Redis: { step_id: "..." }
    │
    ▼
Redis (message broker)
    │
    ▼
Celery Worker (evaluate_step task)
    │
    ├── 1. Read step from DB (input, output, model, prompt_version_id)
    ├── 2. Read eval_metrics for this project
    ├── 3. For each metric:
    │       ├── Build judge prompt = metric.judge_prompt + step input/output
    │       ├── Call judge LLM via LiteLLM
    │       ├── Parse JSON response: { "score": 4.2, "reasoning": "..." }
    │       └── Insert eval_score row
    └── 4. Done (scores now visible in web UI)
```

### 5.5 Judge Prompt Template

Stored in `eval_metric.judge_prompt`. Example for `task_completion`:

```
You are evaluating an AI agent's response quality.

## Evaluation Criteria: Task Completion
Assess whether the agent completed the user's requested task.
Consider:
- Was the core request addressed?
- Were all sub-tasks handled?
- Is the response actionable and complete?

## Agent Input
{input}

## Agent Output
{output}

## Instructions
Score from 0 to 5, where:
- 0: Task completely ignored
- 1: Task acknowledged but not attempted
- 2: Partial attempt, major gaps
- 3: Reasonable attempt, some gaps
- 4: Task completed with minor issues
- 5: Task completed thoroughly

Respond in JSON format only:
{
  "score": <number 0-5>,
  "reasoning": "<your explanation>"
}
```

### 5.6 Access Control

- Evaluator-backend is **internal only**
- Not exposed to the public internet
- Only java-backend communicates with it (via Redis for task dispatch)
- Evaluator reads/writes directly to PostgreSQL for step data and eval_score storage

---

## 6. Web Frontend Changes

### 6.1 Prompt Management Pages

#### 6.1.1 Prompt List Page

- List all prompts for the current project
- Show prompt name, description, type, number of versions, active labels
- Create new prompt button

#### 6.1.2 Prompt Detail Page

- Show prompt metadata (name, description, type)
- **Version history**: list all versions, ordered by created_at DESC
  - Each version shows: version string, commit message, created_by, created_at, content preview
- **Labels panel**: show all labels and which version each points to
  - Reassign label to a different version (dropdown)
  - Create new label
- **Version content editor**: view/edit template content (creates new version on save)
  - Syntax highlighting for `{placeholder}` variables
  - Variable declaration editor
  - Model config editor (temperature, model, etc.)

#### 6.1.3 Version Comparison Page

- Side-by-side diff of two prompt versions
- Show evaluation score aggregates for each version (if available)

### 6.2 Evaluation Display

#### 6.2.1 Step Detail Page — Evaluation Tab (new tab)

On the existing step detail page, add an evaluation section:

- **Auto scores**: show all machine-judged scores with reasoning (read-only)
- **Human score form**: for each eval_metric, a slider/input + comment box, submit button
- **Suggest better response**: text area to write ideal output + comment, submit button
- **Prompt version info**: show which prompt template and version produced this step (linked to prompt detail page)

#### 6.2.2 Prompt Evaluation Dashboard

- Select a prompt → see aggregated scores across all versions
- Bar chart / table: avg score per metric per version
- Filter by evaluator_type (auto / human / both)
- Filter by date range
- Sample size shown alongside each aggregate

### 6.3 Evaluation Metric Management Page

- List all eval_metrics for the project
- Create / edit / delete metrics
- Edit the judge prompt with preview
- Set score range

---

## 7. Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                     USER'S AGENT CODE                            │
│                                                                  │
│  @track(prompt="robin_system")          # or ("robin_system",    │
│  def my_agent_step(query):              #     "staging")         │
│      system = f"You are Robin... {context}"                      │
│      response = llm.call(system=system, ...)                     │
│      return response                                             │
└─────────────────────────┬────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼                           ▼
┌────────────────────┐       ┌────────────────────────┐
│ java-backend        │       │ java-backend             │
│ GET /prompt/resolve │       │ POST /log/step           │
│                     │       │ (includes prompt_version │
│ Returns:            │       │  _id from mwin context)  │
│ prompt_version_id   │       └───────────┬──────────────┘
│ (mwin caches it)    │                   │
└────────────────────┘                   │
                                          ▼
                                ┌──────────────────┐
                                │ Redis              │
                                │ (task published)   │
                                └────────┬─────────┘
                                         │
                                         ▼
                              ┌────────────────────────┐
                              │ aitrace-evaluator       │
                              │ (Celery worker)         │
                              │                         │
                              │ For each eval_metric:   │
                              │   → call judge LLM      │
                              │   → write eval_score    │
                              └────────────────────────┘
                                         │
                                         ▼
                              ┌────────────────────────┐
                              │ Web UI                   │
                              │                         │
                              │ • Prompt editor          │
                              │ • Version management     │
                              │ • Label assignment       │
                              │ • Eval scores display    │
                              │ • Human annotation       │
                              │ • Version comparison     │
                              └────────────────────────┘
```

---

## 8. Implementation Order

Recommended phased approach:

### Phase 1: Database + Java Backend (Prompt CRUD)

1. Create `prompt`, `prompt_version`, `prompt_label` tables
2. Add `prompt_version_id` column to `step` table
3. Implement JPA entities, repositories, controllers for prompt management
4. Implement `GET /prompt/resolve` endpoint (critical for mwin)

### Phase 2: mwin SDK

1. Add `prompt` parameter parsing to `@track`
2. Implement prompt resolution (call java-backend, cache result)
3. Add `prompt_version_id` to `LogStepRequest`
4. Attach `prompt_version_id` to step context during execution

### Phase 3: Web — Prompt Management UI

1. Prompt list page
2. Prompt detail page (version history, label management, content editor)
3. Version comparison page

### Phase 4: Evaluator Backend

1. Set up project structure (FastAPI + Celery + Redis)
2. Implement Celery task for step evaluation
3. Implement judge engine (LiteLLM)
4. Create `eval_metric`, `eval_score`, `eval_annotation` tables
5. Java-backend: publish to Redis after step save
6. Java-backend: evaluation query endpoints

### Phase 5: Web — Evaluation UI

1. Eval metric management page
2. Step detail page — evaluation tab (auto scores, human scoring, annotation)
3. Prompt evaluation dashboard (aggregated scores per version)

---

## 9. Open Decisions (To Be Resolved During Implementation)

| Item | Question | Default if not resolved |
|------|----------|------------------------|
| Cache TTL | 5 minutes sufficient? | 5 minutes |
| Judge LLM model | Which model for automated evaluation? | Configure per project in config.toml |
| Eval trigger condition | Evaluate all steps or only those with prompt_version_id? | Only steps with prompt_version_id |
| Redis deployment | Shared Redis or dedicated for evaluator? | Shared instance, separate DB number |
| Prompt content format | JSON with `{"template": "..."}` or plain text string? | JSON for extensibility |
