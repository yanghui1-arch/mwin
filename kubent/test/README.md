# Kubent Unit Tests

Unit tests for the `kubent` Python service. All tests run without Docker, Redis,
a live database, or a real LLM API key.

## Structure

```
test/
├── conftest.py            # Module-level stubs loaded before any test file
├── test_config.py         # src.config.Config
├── test_env.py            # src.env.Env
├── test_guard.py          # src.api.guard.AgentCapacityGuard
├── test_jwt.py            # src.api.jwt.verify_at_token
├── test_mermaid.py        # src.utils.mermaid.steps_to_mermaid
├── test_response_model.py # src.api.schemas.response.ResponseModel
└── test_runner.py         # src.agent.runner (run_with_callback, add_chat, SSEEvent)
```

## Running

All commands must be run from the `kubent/` directory.

```bash
# All tests
uv run python -m pytest test/ -v

# Single file
uv run python -m pytest test/test_env.py -v

# Single class or function
uv run python -m pytest test/test_env.py::TestEnvReset -v
uv run python -m pytest test/test_env.py::TestEnvReset::test_clears_steps_counter -v

# Stop on first failure
uv run python -m pytest test/ -x --tb=short
```

## conftest.py

`conftest.py` stubs out four dependencies at the module level so imports succeed
without any external services:

| Stub | Reason |
|------|--------|
| `API_KEY` / `OPENAI_API_KEY` / `BASE_URL` env vars | `OpenAI()` is instantiated at class-definition time in several tool modules |
| `mwin` | `@track` decorators must be no-op pass-throughs |
| `docker` | Not available in a pure unit-test environment |
| `src.sandbox` | Imports Docker at module level via `bash.py` |

## Test Coverage

| File | Module Under Test | Key Behaviours Covered |
|------|-------------------|------------------------|
| `test_config.py` | `src.config.Config` | Key lookup (top-level, dotted, nested), missing keys, non-string values, malformed/missing TOML, caching, `reload()` |
| `test_env.py` | `src.env.Env` | `reset()` clears state, `step()` terminal path, tool-call path (think / action / unknown / invalid JSON / empty list), observation accumulation, `update_space_action()` |
| `test_guard.py` | `src.api.guard.AgentCapacityGuard` | Acquire below/at capacity, release re-enables slot, `max_concurrent=0`, 10 concurrent coroutines with limit 3 |
| `test_jwt.py` | `src.api.jwt.verify_at_token` | Valid token, expired, wrong secret, invalid string, empty string, missing `sub`, non-UUID `sub`, wrong algorithm, whitespace-only, garbage bytes |
| `test_mermaid.py` | `src.utils.mermaid.steps_to_mermaid` | Empty list, single root, sequential arrows, parent-child subgraph, cross-edges, insertion-order independence, `MermaidResult.__str__` |
| `test_response_model.py` | `src.api.schemas.response.ResponseModel` | `success()` / `error()` factory methods, default field values, generic type annotation, falsy message fallback |
| `test_runner.py` | `src.agent.runner` | `SSEEvent` fields and serialisation, `run_with_callback` solved/exceed/cancel/token-delta/tool-names paths, `add_chat` DB writes, chats list ordering |

## Behavioral Notes

- `Env.reset()` does **not** reset `num_think`. Callers should construct a fresh
  `Env` instance per agent run if a clean counter is needed.
- `Config.get()` returns `None` for a completely absent leaf key (no default
  provided). `ValueError` is only raised when an *intermediate* key resolves to
  a non-dict type and no default is given — contrary to what the docstring implies.
