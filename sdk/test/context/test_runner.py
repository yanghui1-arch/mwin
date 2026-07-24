import asyncio

import pytest

from mwin import context, start_trace, start_trace_async
from mwin.helper import args_helper


def test_start_trace_creates_nested_trace_and_restores_parent():
    with start_trace(name="parent", input={"request": "hello"}) as parent:
        assert context.get_storage_current_trace_data() is parent
        assert parent.parent_trace_id is None
        assert parent.name == "parent"
        assert parent.input == {"request": "hello"}

        with start_trace(name="child") as child:
            assert context.get_storage_current_trace_data() is child
            assert child.id != parent.id
            assert child.parent_trace_id == parent.id
            assert child.conversation_id == parent.conversation_id

        assert context.get_storage_current_trace_data() is parent

    assert context.get_storage_current_trace_data() is None


def test_start_trace_restores_parent_after_child_error():
    with start_trace() as parent:
        with pytest.raises(RuntimeError, match="child failed"):
            with start_trace():
                raise RuntimeError("child failed")

        assert context.get_storage_current_trace_data() is parent

    assert context.get_storage_current_trace_data() is None


def test_start_trace_uses_trace_local_step_stack():
    with start_trace() as parent:
        parent_step = args_helper.create_new_step(name="parent-step")
        context.add_storage_step(parent_step)

        with start_trace() as child:
            assert context.get_storage_top_step_data() is None

            child_step = args_helper.create_new_step(name="child-step")
            context.add_storage_step(child_step)

            assert child_step.trace_id == child.id
            assert child_step.parent_step_id is None

        assert context.get_storage_top_step_data() is parent_step
        assert parent_step.trace_id == parent.id


def test_start_trace_async_creates_nested_trace_and_restores_parent():
    async def run():
        async with start_trace_async(name="parent") as parent:
            assert context.get_storage_current_trace_data() is parent

            async with start_trace_async(name="child") as child:
                assert context.get_storage_current_trace_data() is child
                assert child.parent_trace_id == parent.id
                assert child.conversation_id == parent.conversation_id

            assert context.get_storage_current_trace_data() is parent

        assert context.get_storage_current_trace_data() is None

    asyncio.run(run())
