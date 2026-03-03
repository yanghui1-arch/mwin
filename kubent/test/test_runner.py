"""Unit tests for src.agent.runner

Covers:
  - SSEEvent: field defaults, serialisation, AgentEventType values.
  - run_with_callback:
      * Solved run returns the correct answer and populates chats.
      * Chats list order: [user_msg] + obs + [assistant_msg].
      * Cancellation before the first step skips all stream_step calls.
      * Max-attempt exhaustion returns the "exceed" fallback message.
      * on_token callback fires for each streamed delta.
      * tool_names are reported in the PROGRESS event following env.step().
      * chat_hist and agent_workflows are forwarded to stream_step.
      * on_progress is called at least once per step.
  - add_chat:
      * Calls create_new_chat_sync once per message.
      * Raises ValueError when a message has no 'role' key.
      * Handles empty message list without DB calls.
"""
from __future__ import annotations

import threading
from typing import List
from unittest.mock import MagicMock, call

import pytest

from src.agent.runner import AgentEventType, SSEEvent, run_with_callback


# ── helpers ───────────────────────────────────────────────────────────────────

def _solved_env(answer: str = "solved answer") -> MagicMock:
    """Return a mock Env that immediately terminates with answer."""
    env = MagicMock()
    env.reset.return_value = []
    env.step.return_value = (
        [],   # obs
        0,    # reward
        True, # terminate
        {
            "step_finish_reason": "solved",
            "steps": 1,
            "num_tool_callings": 0,
            "answer": answer,
            "tool_use": None,
        },
    )
    return env


def _unsolved_env(tool_names: List[str] | None = None) -> MagicMock:
    """Return a mock Env that never terminates on its own."""
    env = MagicMock()
    env.reset.return_value = []
    env.step.return_value = (
        [],    # obs
        0,     # reward
        False, # never terminates
        {
            "step_finish_reason": "action",
            "steps": 1,
            "num_tool_callings": 1,
            "answer": None,
            "tool_use": [{"name": n, "result": "r"} for n in (tool_names or [])],
        },
    )
    return env


def _simple_kubent(answer: str = "solved answer", attempt: int = 5) -> MagicMock:
    kubent = MagicMock()
    kubent.attempt = attempt
    kubent.stream_step.return_value = (answer, None)
    return kubent


# ── tests: SSEEvent model ─────────────────────────────────────────────────────

class TestSSEEvent:
    def test_progress_event_with_delta(self):
        e = SSEEvent(type=AgentEventType.PROGRESS, delta="hello")
        assert e.type == AgentEventType.PROGRESS
        assert e.delta == "hello"
        assert e.answer is None
        assert e.detail is None

    def test_progress_event_with_tool_names(self):
        e = SSEEvent(type=AgentEventType.PROGRESS, tool_names=["search_google"])
        assert e.tool_names == ["search_google"]

    def test_done_event_carries_answer(self):
        e = SSEEvent(type=AgentEventType.DONE, answer="final answer")
        assert e.type == AgentEventType.DONE
        assert e.answer == "final answer"

    def test_error_event_carries_detail(self):
        e = SSEEvent(type=AgentEventType.ERROR, detail="something went wrong")
        assert e.type == AgentEventType.ERROR
        assert e.detail == "something went wrong"

    def test_all_optional_fields_default_to_none(self):
        e = SSEEvent(type=AgentEventType.PROGRESS)
        assert e.delta is None
        assert e.tool_names is None
        assert e.answer is None
        assert e.detail is None

    def test_event_serialises_to_json_string(self):
        e = SSEEvent(type=AgentEventType.DONE, answer="ok")
        json_str = e.model_dump_json()
        assert "DONE" in json_str
        assert "ok" in json_str

    def test_agent_event_type_string_values(self):
        assert AgentEventType.PROGRESS == "PROGRESS"
        assert AgentEventType.DONE == "DONE"
        assert AgentEventType.ERROR == "ERROR"

    def test_tool_names_can_be_empty_list(self):
        e = SSEEvent(type=AgentEventType.PROGRESS, tool_names=[])
        assert e.tool_names == []

    def test_multiple_tool_names(self):
        e = SSEEvent(type=AgentEventType.PROGRESS, tool_names=["a", "b", "c"])
        assert len(e.tool_names) == 3


# ── tests: run_with_callback ──────────────────────────────────────────────────

class TestRunWithCallback:
    def test_solved_run_returns_correct_answer(self):
        env = _solved_env(answer="final answer")
        kubent = _simple_kubent(answer="final answer")
        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="What is 2+2?",
        )
        assert result.answer == "final answer"

    def test_solved_run_includes_user_and_assistant_in_chats(self):
        env = _solved_env(answer="done")
        kubent = _simple_kubent(answer="done")
        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="question",
        )
        roles = [m.get("role") for m in result.chats]
        assert "user" in roles
        assert "assistant" in roles

    def test_solved_run_user_message_matches_question(self):
        env = _solved_env()
        kubent = _simple_kubent()
        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="my specific question",
        )
        user_msgs = [m for m in result.chats if m.get("role") == "user"]
        assert user_msgs[0]["content"] == "my specific question"

    def test_on_progress_called_at_least_once_per_step(self):
        env = _solved_env()
        kubent = _simple_kubent()
        events: list[SSEEvent] = []
        run_with_callback(
            on_progress=lambda e: events.append(e),
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        assert len(events) >= 1

    def test_cancel_before_start_skips_stream_step(self):
        """If cancel is already set, stream_step should never be called."""
        env = _unsolved_env()
        kubent = _simple_kubent(attempt=100)
        cancel = threading.Event()
        cancel.set()
        run_with_callback(
            on_progress=lambda e: None,
            cancel=cancel,
            env=env,
            kubent=kubent,
            question="q",
        )
        kubent.stream_step.assert_not_called()

    def test_cancel_after_first_step_stops_at_second(self):
        """Cancel set inside on_progress should stop the loop promptly."""
        cancel = threading.Event()
        call_count = 0

        env = _unsolved_env()
        kubent = _simple_kubent(attempt=100)

        def on_progress(event: SSEEvent):
            nonlocal call_count
            call_count += 1
            cancel.set()  # cancel on first progress event

        run_with_callback(
            on_progress=on_progress,
            cancel=cancel,
            env=env,
            kubent=kubent,
            question="q",
        )
        # stream_step must have been called at most once (the first step only)
        assert kubent.stream_step.call_count <= 1

    def test_max_attempts_stops_loop(self):
        env = _unsolved_env()
        kubent = _simple_kubent(attempt=3)
        kubent.stream_step.return_value = (None, None)

        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        assert "Exceed max attempts" in result.answer
        assert kubent.stream_step.call_count == 3

    def test_exceed_chats_include_user_and_assistant(self):
        env = _unsolved_env()
        kubent = _simple_kubent(attempt=2)
        kubent.stream_step.return_value = (None, None)

        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        roles = [m.get("role") for m in result.chats]
        assert "user" in roles
        assert "assistant" in roles

    def test_token_deltas_emitted_as_progress_events(self):
        """Tokens yielded by on_token inside stream_step arrive as PROGRESS events."""
        env = _solved_env()
        kubent = MagicMock()
        kubent.attempt = 5

        def fake_stream_step(**kwargs):
            on_token = kwargs.get("on_token")
            if on_token:
                on_token("tok1")
                on_token("tok2")
            return ("tok1tok2", None)

        kubent.stream_step.side_effect = fake_stream_step
        env.step.return_value = (
            [], 0, True,
            {"step_finish_reason": "solved", "steps": 1,
             "num_tool_callings": 0, "answer": "tok1tok2", "tool_use": None},
        )

        all_events: list[SSEEvent] = []
        run_with_callback(
            on_progress=lambda e: all_events.append(e),
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        deltas = [e.delta for e in all_events if e.delta is not None]
        assert deltas == ["tok1", "tok2"]

    def test_tool_names_appear_in_progress_event(self):
        """After a step with tool usage, a PROGRESS event with tool_names is emitted."""
        env = MagicMock()
        env.reset.return_value = []
        env.step.return_value = (
            [], 0, True,
            {
                "step_finish_reason": "solved",
                "steps": 1,
                "num_tool_callings": 1,
                "answer": "done",
                "tool_use": [{"name": "bash_command", "result": "ok"}],
            },
        )
        kubent = _simple_kubent(answer="done")
        events: list[SSEEvent] = []
        run_with_callback(
            on_progress=lambda e: events.append(e),
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        tool_events = [e for e in events if e.tool_names is not None]
        assert len(tool_events) >= 1
        assert "bash_command" in tool_events[0].tool_names

    def test_no_tool_names_event_when_tool_use_is_none(self):
        env = _solved_env()
        kubent = _simple_kubent()
        events: list[SSEEvent] = []
        run_with_callback(
            on_progress=lambda e: events.append(e),
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        tool_name_events = [e for e in events if e.tool_names is not None]
        assert tool_name_events == []

    def test_chat_hist_forwarded_to_stream_step(self):
        env = _solved_env()
        kubent = _simple_kubent()
        chat_hist = [{"role": "user", "content": "prev message"}]
        run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
            chat_hist=chat_hist,
        )
        call_kwargs = kubent.stream_step.call_args[1]
        assert call_kwargs.get("chat_hist") == chat_hist

    def test_agent_workflows_forwarded_to_stream_step(self):
        env = _solved_env()
        kubent = _simple_kubent()
        workflows = ["flowchart TD\n  n0[step]"]
        run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
            agent_workflows=workflows,
        )
        call_kwargs = kubent.stream_step.call_args[1]
        assert call_kwargs.get("agent_workflows") == workflows

    def test_question_forwarded_to_stream_step(self):
        env = _solved_env()
        kubent = _simple_kubent()
        run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="specific question text",
        )
        call_kwargs = kubent.stream_step.call_args[1]
        assert call_kwargs.get("question") == "specific question text"

    def test_none_chat_hist_forwarded_as_none(self):
        env = _solved_env()
        kubent = _simple_kubent()
        run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
            chat_hist=None,
        )
        call_kwargs = kubent.stream_step.call_args[1]
        assert call_kwargs.get("chat_hist") is None

    def test_solved_chats_order_is_user_then_obs_then_assistant(self):
        """Result.chats must be [user_msg] + obs_msgs + [assistant_msg]."""
        sentinel_obs = {"role": "tool", "content": "obs_sentinel", "tool_call_id": "x"}
        env = MagicMock()
        env.reset.return_value = []
        env.step.return_value = (
            [sentinel_obs],   # obs contains the sentinel
            0, True,
            {"step_finish_reason": "solved", "steps": 1,
             "num_tool_callings": 0, "answer": "final", "tool_use": None},
        )
        kubent = _simple_kubent(answer="final")
        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="my_question",
        )
        assert result.chats[0] == {"role": "user", "content": "my_question"}
        assert result.chats[1] == sentinel_obs
        assert result.chats[-1]["role"] == "assistant"
        assert result.chats[-1]["content"] == "final"

    def test_exceed_chats_order_is_user_then_obs_then_assistant(self):
        """Even on exceeded attempts, chats keep the same order."""
        sentinel_obs = {"role": "tool", "content": "obs_sentinel", "tool_call_id": "x"}
        env = MagicMock()
        env.reset.return_value = []
        env.step.return_value = (
            [sentinel_obs], 0, False,
            {"step_finish_reason": "action", "steps": 1,
             "num_tool_callings": 0, "answer": None, "tool_use": None},
        )
        kubent = _simple_kubent(attempt=1)
        kubent.stream_step.return_value = (None, None)
        result = run_with_callback(
            on_progress=lambda e: None,
            cancel=threading.Event(),
            env=env,
            kubent=kubent,
            question="q",
        )
        assert result.chats[0]["role"] == "user"
        assert result.chats[1] == sentinel_obs
        assert result.chats[-1]["role"] == "assistant"


# ── tests: add_chat() ─────────────────────────────────────────────────────────

class TestAddChat:
    def _run(self, messages, mock_session, mock_kubent_chat=None):
        """Helper: patch SessionLocal and kubent_chat then call add_chat."""
        from unittest.mock import patch, MagicMock
        import uuid as _uuid
        from src.agent.runner import add_chat

        mock_db = MagicMock()
        mock_session.return_value.__enter__.return_value = mock_db

        session_id = _uuid.uuid4()
        user_id = _uuid.uuid4()
        if mock_kubent_chat:
            add_chat(session_id, user_id, messages, agent_name="kubent")
        else:
            add_chat(session_id, user_id, messages, agent_name="kubent")
        return mock_db

    def test_create_called_once_per_message(self):
        from unittest.mock import patch, MagicMock
        import uuid as _uuid
        from src.agent.runner import add_chat

        messages = [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi there"},
        ]
        mock_db = MagicMock()
        with patch("src.agent.runner.SessionLocal") as mock_sl, \
             patch("src.agent.runner.kubent_chat") as mock_kc:
            mock_sl.return_value.__enter__.return_value = mock_db
            add_chat(_uuid.uuid4(), _uuid.uuid4(), messages, agent_name="kubent")
            assert mock_kc.create_new_chat_sync.call_count == 2

    def test_raises_value_error_when_role_missing(self):
        from unittest.mock import patch, MagicMock
        import uuid as _uuid
        from src.agent.runner import add_chat

        messages = [{"content": "no role key"}]
        mock_db = MagicMock()
        with patch("src.agent.runner.SessionLocal") as mock_sl, \
             patch("src.agent.runner.kubent_chat"):
            mock_sl.return_value.__enter__.return_value = mock_db
            with pytest.raises(ValueError, match="no role"):
                add_chat(_uuid.uuid4(), _uuid.uuid4(), messages, agent_name="kubent")

    def test_empty_messages_list_makes_no_db_calls(self):
        from unittest.mock import patch, MagicMock
        import uuid as _uuid
        from src.agent.runner import add_chat

        mock_db = MagicMock()
        with patch("src.agent.runner.SessionLocal") as mock_sl, \
             patch("src.agent.runner.kubent_chat") as mock_kc:
            mock_sl.return_value.__enter__.return_value = mock_db
            add_chat(_uuid.uuid4(), _uuid.uuid4(), [], agent_name="kubent")
            mock_kc.create_new_chat_sync.assert_not_called()

    def test_agent_name_forwarded_to_create(self):
        from unittest.mock import patch, MagicMock, call
        import uuid as _uuid
        from src.agent.runner import add_chat

        messages = [{"role": "user", "content": "hi"}]
        mock_db = MagicMock()
        with patch("src.agent.runner.SessionLocal") as mock_sl, \
             patch("src.agent.runner.kubent_chat") as mock_kc:
            mock_sl.return_value.__enter__.return_value = mock_db
            add_chat(_uuid.uuid4(), _uuid.uuid4(), messages, agent_name="my_agent")
            kwargs = mock_kc.create_new_chat_sync.call_args[1]
            assert kwargs["agent_name"] == "my_agent"

    def test_role_forwarded_to_create(self):
        from unittest.mock import patch, MagicMock
        import uuid as _uuid
        from src.agent.runner import add_chat

        messages = [{"role": "assistant", "content": "reply"}]
        mock_db = MagicMock()
        with patch("src.agent.runner.SessionLocal") as mock_sl, \
             patch("src.agent.runner.kubent_chat") as mock_kc:
            mock_sl.return_value.__enter__.return_value = mock_db
            add_chat(_uuid.uuid4(), _uuid.uuid4(), messages, agent_name="kubent")
            kwargs = mock_kc.create_new_chat_sync.call_args[1]
            assert kwargs["role"] == "assistant"
