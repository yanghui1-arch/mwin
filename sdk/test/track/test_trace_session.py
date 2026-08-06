from mwin import context, start_trace, track


def test_track_records_completed_step_in_trace_tree_buffer(fake_client):
    @track(tags=["unit"])
    def child_step(value):
        return value

    with start_trace(name="request") as trace:
        tree_buffer = context.get_storage_current_trace_tree_buffer()

        assert child_step("ok") == "ok"
        assert tree_buffer is not None
        assert len(tree_buffer.steps) == 1
        assert tree_buffer.steps[0].trace_id == trace.id
        assert tree_buffer.steps[0].output == {"func_output": "ok"}
        assert tree_buffer.get_step_status(tree_buffer.steps[0].id) == "completed"

    assert tree_buffer.is_complete is True
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1


def test_trace_tree_buffer_keeps_parent_step_before_child(fake_client):
    @track(tags=["unit"])
    def child_step():
        return "child"

    @track(tags=["unit"])
    def parent_step():
        return child_step()

    with start_trace():
        tree_buffer = context.get_storage_current_trace_tree_buffer()
        assert parent_step() == "child"

        assert tree_buffer is not None
        assert [
            step.name.rsplit(".", maxsplit=1)[-1]
            for step in tree_buffer.steps
        ] == [
            "parent_step",
            "child_step",
        ]
        assert tree_buffer.steps[1].parent_step_id == tree_buffer.steps[0].id
