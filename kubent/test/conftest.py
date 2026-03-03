"""conftest.py

Patches heavy optional dependencies so unit tests can run without Docker,
Redis, a live database, or a real LLM API key.

All patches are applied at the *module* level (not inside fixtures) so they
are in place before pytest collects any test file.
"""
import inspect
import os
import sys
from unittest.mock import MagicMock

# ── 1. Dummy API keys (openai.OpenAI is instantiated at class-definition time
#        in several tool modules and requires a non-empty api_key).
os.environ.setdefault("API_KEY", "test-key")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("BASE_URL", "https://test.example.com/v1")


# ── 2. Stub mwin (tracing / observability library) ─────────────────────────────
# @track and @track(...) are used extensively as decorators.
# They must be no-op pass-throughs so decorated functions remain callable.

def _passthrough_track(*args, **kwargs):
    """Mimic both @track (bare) and @track(...) as no-op decorators."""
    # @track applied directly to a function with no parentheses
    if len(args) == 1 and inspect.isfunction(args[0]):
        return args[0]
    # @track(...) with arguments — return a decorator that does nothing
    def _decorator(fn):
        return fn
    return _decorator


_mock_mwin = MagicMock()
_mock_mwin.track = _passthrough_track
sys.modules["mwin"] = _mock_mwin


# ── 3. Stub docker (not installed in a pure-unit-test environment) ──────────────
sys.modules["docker"] = MagicMock()


# ── 4. Stub src.sandbox (requires Docker) ──────────────────────────────────────
# bash.py does `from ...sandbox import get_sandbox_manager, ...`
# Mocking the package-level entry in sys.modules prevents the real __init__
# (which imports docker) from running.
sys.modules["src.sandbox"] = MagicMock()
