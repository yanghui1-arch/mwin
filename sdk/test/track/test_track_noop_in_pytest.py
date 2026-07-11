from mwin import context, track


def test_track_is_noop_under_pytest_without_opt_in(monkeypatch):
    monkeypatch.delenv("MWIN_ENABLE_TRACK_IN_TEST", raising=False)

    @track(tags=["unit"])
    def add(x: int, y: int) -> int:
        return x + y

    assert add(1, 2) == 3
    assert context.get_storage_current_trace_data() is None
    assert context.pop_storage_step() is None
