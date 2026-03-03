"""Unit tests for src.env.Env

Covers:
  - reset(): clears all mutable state.
  - step(content, tool_calls=None): terminal "solved" path.
  - step(content, tool_calls=[...]): tool execution path.
    * think-type tool increments num_think, sets reason "think".
    * action-type tool increments num_tool_callings, sets reason "action".
    * Unknown tool name appends an error observation.
    * Invalid JSON arguments appends an error observation.
  - Observations accumulate across multiple calls to step().
  - update_space_action(): registers known tools; silently skips unknowns.
  - _get_info(): returns correctly shaped EnvStepInfo dict.
"""
from __future__ import annotations

import json
import pytest
from unittest.mock import MagicMock

from openai.types.chat.chat_completion_message_tool_call import (
    ChatCompletionMessageToolCall,
    Function,
)

from src.env import Env, Action


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_env(name: str = "test_env") -> Env:
    return Env(env_name=name)


def _make_tool_call(
    tool_name: str,
    arguments: dict | str = {},
    call_id: str = "call_abc123",
) -> ChatCompletionMessageToolCall:
    """Build a ChatCompletionMessageToolCall for use in env.step()."""
    if isinstance(arguments, dict):
        arguments = json.dumps(arguments)
    return ChatCompletionMessageToolCall(
        id=call_id,
        type="function",
        function=Function(name=tool_name, arguments=arguments),
    )


def _think_action() -> Action:
    return Action(func=lambda question: "I thought: " + question, type="think")


def _search_action() -> Action:
    return Action(func=lambda keyword: "result for: " + keyword, type="search")


def _general_action() -> Action:
    return Action(func=lambda **kwargs: "done", type="general_function")


# ── tests: reset() ────────────────────────────────────────────────────────────

class TestEnvReset:
    def test_returns_empty_list(self):
        env = _make_env()
        assert env.reset() == []

    def test_clears_obs(self):
        env = _make_env()
        env.obs = [{"role": "user", "content": "hi"}]
        obs = env.reset()
        assert obs == []
        assert env.obs == []

    def test_clears_steps_counter(self):
        env = _make_env()
        env.steps = 5
        env.reset()
        assert env.steps == 0

    def test_clears_num_tool_callings(self):
        env = _make_env()
        env.num_tool_callings = 3
        env.reset()
        assert env.num_tool_callings == 0

    def test_num_think_is_not_cleared_by_reset(self):
        # NOTE: reset() intentionally does not reset num_think.
        # This documents the current behaviour; callers should construct
        # a fresh Env per agent run instead of relying on reset() to clear it.
        env = _make_env()
        env.num_think = 7
        env.reset()
        assert env.num_think == 7

    def test_clears_answer(self):
        env = _make_env()
        env.answer = "some answer"
        env.reset()
        assert env.answer is None

    def test_clears_step_finish_reason(self):
        env = _make_env()
        env.step_finish_reason = "solved"
        env.reset()
        assert env.step_finish_reason is None

    def test_clears_tool_usage_history(self):
        env = _make_env()
        env.tool_usage_history = [{"name": "tool", "result": "ok"}]
        env.reset()
        assert env.tool_usage_history is None

    def test_idempotent_on_fresh_env(self):
        env = _make_env()
        result1 = env.reset()
        result2 = env.reset()
        assert result1 == result2 == []


# ── tests: step() – terminal (content only) ───────────────────────────────────

class TestEnvStepContentOnly:
    def test_terminates(self):
        env = _make_env()
        _, _, terminate, _ = env.step(content="The answer is 42.", tool_calls=None)
        assert terminate is True

    def test_finish_reason_is_solved(self):
        env = _make_env()
        _, _, _, info = env.step(content="answer", tool_calls=None)
        assert info["step_finish_reason"] == "solved"

    def test_stores_answer_in_info(self):
        env = _make_env()
        _, _, _, info = env.step(content="my answer", tool_calls=None)
        assert info["answer"] == "my answer"

    def test_increments_steps(self):
        env = _make_env()
        env.step(content="done", tool_calls=None)
        assert env.steps == 1

    def test_obs_not_modified(self):
        env = _make_env()
        obs, _, _, _ = env.step(content="done", tool_calls=None)
        assert obs == []

    def test_reward_is_zero(self):
        env = _make_env()
        _, reward, _, _ = env.step(content="done", tool_calls=None)
        assert reward == 0

    def test_none_content_with_no_tool_calls_does_not_terminate(self):
        """Degenerate case: content=None and tool_calls=None.
        The solved-path guard is `content is not None and tool_calls is None`,
        so None content is NOT treated as a terminal step — the env simply
        increments the step counter and returns terminate=False.
        """
        env = _make_env()
        _, _, terminate, _ = env.step(content=None, tool_calls=None)
        assert terminate is False

    def test_multiple_terminal_steps_accumulate_steps_counter(self):
        env = _make_env()
        env.step(content="step1", tool_calls=None)
        env.step(content="step2", tool_calls=None)
        assert env.steps == 2


# ── tests: step() – tool calls ────────────────────────────────────────────────

class TestEnvStepWithToolCalls:
    def test_tool_call_does_not_terminate(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "why?"})
        _, _, terminate, _ = env.step(content=None, tool_calls=[tc])
        assert terminate is False

    def test_think_tool_increments_num_think(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "what?"})
        env.step(content=None, tool_calls=[tc])
        assert env.num_think == 1

    def test_think_tool_sets_reason_think(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "test"})
        _, _, _, info = env.step(content=None, tool_calls=[tc])
        assert info["step_finish_reason"] == "think"

    def test_action_tool_increments_num_tool_callings(self):
        env = _make_env()
        env.action_spaces["search_google"] = _search_action()
        tc = _make_tool_call("search_google", {"keyword": "python"})
        env.step(content=None, tool_calls=[tc])
        assert env.num_tool_callings == 1

    def test_action_tool_sets_reason_action(self):
        env = _make_env()
        env.action_spaces["search_google"] = _search_action()
        tc = _make_tool_call("search_google", {"keyword": "test"})
        _, _, _, info = env.step(content=None, tool_calls=[tc])
        assert info["step_finish_reason"] == "action"

    def test_tool_result_appended_to_obs(self):
        env = _make_env()
        env.action_spaces["search_google"] = _search_action()
        tc = _make_tool_call("search_google", {"keyword": "pytest"})
        obs, _, _, _ = env.step(content=None, tool_calls=[tc])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert len(tool_msgs) == 1
        assert "pytest" in tool_msgs[0]["content"]

    def test_assistant_message_appended_to_obs(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "q"})
        obs, _, _, _ = env.step(content="thinking...", tool_calls=[tc])
        assistant_msgs = [m for m in obs if m["role"] == "assistant"]
        assert len(assistant_msgs) == 1
        assert assistant_msgs[0]["content"] == "thinking..."

    def test_multiple_tool_calls_in_one_step(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        env.action_spaces["search_google"] = _search_action()
        tc1 = _make_tool_call("think_process", {"question": "q?"}, call_id="call_1")
        tc2 = _make_tool_call("search_google", {"keyword": "k"}, call_id="call_2")
        obs, _, _, _ = env.step(content=None, tool_calls=[tc1, tc2])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert len(tool_msgs) == 2

    def test_tool_usage_history_populated(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "test?"})
        _, _, _, info = env.step(content=None, tool_calls=[tc])
        assert info["tool_use"] is not None
        assert len(info["tool_use"]) == 1
        assert info["tool_use"][0]["name"] == "think_process"

    def test_steps_incremented_after_tool_call(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "q"})
        env.step(content=None, tool_calls=[tc])
        assert env.steps == 1

    def test_think_observation_has_think_prefix(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "why?"})
        obs, _, _, _ = env.step(content=None, tool_calls=[tc])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert "[Think #" in tool_msgs[0]["content"]

    def test_action_observation_has_observation_prefix(self):
        env = _make_env()
        env.action_spaces["search_google"] = _search_action()
        tc = _make_tool_call("search_google", {"keyword": "test"})
        obs, _, _, _ = env.step(content=None, tool_calls=[tc])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert "[Observation #" in tool_msgs[0]["content"]

    def test_think_counter_increments_with_each_think_tool(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "q"})
        env.step(content=None, tool_calls=[tc])
        env.step(content=None, tool_calls=[tc])
        assert env.num_think == 2

    def test_obs_accumulates_across_multiple_steps(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "q"})
        env.step(content=None, tool_calls=[tc])
        env.step(content=None, tool_calls=[tc])
        # Each step: 1 assistant + 1 tool message
        assert len(env.obs) == 4


# ── tests: step() – edge cases ────────────────────────────────────────────────

class TestEnvStepEdgeCases:
    def test_unknown_tool_appends_error_observation(self):
        env = _make_env()
        tc = _make_tool_call("nonexistent_tool", {"foo": "bar"})
        obs, _, _, _ = env.step(content=None, tool_calls=[tc])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert len(tool_msgs) == 1
        content = tool_msgs[0]["content"].lower()
        assert "invaild" in content or "invalid" in content

    def test_invalid_json_arguments_does_not_crash(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", "{NOT_VALID_JSON")
        # Must not raise
        obs, _, _, _ = env.step(content=None, tool_calls=[tc])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert len(tool_msgs) == 1

    def test_invalid_json_with_think_tool_increments_think_counter(self):
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", "{invalid}")
        env.step(content=None, tool_calls=[tc])
        assert env.num_think == 1

    def test_invalid_json_with_action_tool_increments_tool_callings(self):
        env = _make_env()
        env.action_spaces["search_google"] = _search_action()
        tc = _make_tool_call("search_google", "{invalid}")
        env.step(content=None, tool_calls=[tc])
        assert env.num_tool_callings == 1

    def test_get_info_has_expected_keys(self):
        env = _make_env()
        _, _, _, info = env.step(content="done", tool_calls=None)
        assert "step_finish_reason" in info
        assert "steps" in info
        assert "num_tool_callings" in info
        assert "answer" in info
        assert "tool_use" in info

    def test_tool_call_with_empty_string_arguments(self):
        """Empty string for arguments is invalid JSON — should not crash."""
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", "")
        obs, _, _, _ = env.step(content=None, tool_calls=[tc])
        tool_msgs = [m for m in obs if m["role"] == "tool"]
        assert len(tool_msgs) == 1

    def test_action_spaces_unaffected_after_step(self):
        """Calling step should not mutate action_spaces."""
        env = _make_env()
        env.action_spaces["think_process"] = _think_action()
        tc = _make_tool_call("think_process", {"question": "q"})
        env.step(content=None, tool_calls=[tc])
        assert "think_process" in env.action_spaces

    def test_empty_tool_calls_list_does_not_crash(self):
        """step() with tool_calls=[] (empty list, not None) must not raise."""
        env = _make_env()
        # tool_calls is not None, so the tool-execution branch runs over zero items.
        obs, _, terminate, info = env.step(content=None, tool_calls=[])
        assert terminate is False
        assert env.steps == 1

    def test_empty_tool_calls_list_leaves_obs_with_assistant_message(self):
        """When tool_calls=[], an assistant message is still appended."""
        env = _make_env()
        obs, _, _, _ = env.step(content="thinking...", tool_calls=[])
        assistant_msgs = [m for m in obs if m["role"] == "assistant"]
        assert len(assistant_msgs) == 1

    def test_unknown_tool_increments_num_tool_callings(self):
        """Unknown tools still increment num_tool_callings (env tracks attempt)."""
        env = _make_env()
        tc = _make_tool_call("nonexistent_tool", {"x": "y"})
        env.step(content=None, tool_calls=[tc])
        assert env.num_tool_callings == 1

    def test_tool_function_exception_propagates(self):
        """If an action func raises a non-JSONDecodeError exception it is NOT caught
        by env.step() — this documents a known gap in production error handling."""
        def bad_func(**kwargs):
            raise RuntimeError("unexpected failure")

        env = _make_env()
        env.action_spaces["think_process"] = Action(func=bad_func, type="think")
        tc = _make_tool_call("think_process", {"question": "q"})
        with pytest.raises(RuntimeError, match="unexpected failure"):
            env.step(content=None, tool_calls=[tc])

    def test_num_think_not_reset_across_multiple_resets(self):
        """num_think persists across reset() calls; callers must construct
        a fresh Env per agent run if they need a clean counter."""
        env = _make_env()
        env.num_think = 3
        env.reset()
        env.reset()
        assert env.num_think == 3


# ── tests: update_space_action() ─────────────────────────────────────────────

class TestUpdateSpaceAction:
    def test_known_tool_registered_in_action_spaces(self):
        from src.agent.tools import TOOL_KITS
        env = _make_env()
        # Pick the first registered tool
        tool_name = next(iter(TOOL_KITS))
        toolkit = TOOL_KITS[tool_name]
        env.update_space_action(toolkit.json_schema)
        assert tool_name in env.action_spaces

    def test_unknown_tool_does_not_crash(self):
        env = _make_env()
        fake_schema = {
            "type": "function",
            "function": {"name": "nonexistent_xyz", "parameters": {}, "description": ""},
        }
        # Should not raise — just prints a warning
        env.update_space_action(fake_schema)
        assert "nonexistent_xyz" not in env.action_spaces
