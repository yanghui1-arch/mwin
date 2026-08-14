import threading
from concurrent.futures import ThreadPoolExecutor

from mwin import exporter as exporter_module
from mwin.exporter import Exporter, StepSnapshot, TraceTreeSnapshot
from mwin.exporter import telemetry as exporter_implementation
from mwin.models import Step


def snapshot(item_id: int) -> TraceTreeSnapshot:
    return TraceTreeSnapshot.create(
        project_name=f"project-{item_id}",
        traces=(),
        steps=(),
    )


def test_trace_tree_snapshot_copies_step_data():
    source = Step(
        name="step",
        id="step-1",
        trace_id="trace-1",
        input={"name": "你好\ntrace"},
    )
    snapshot = TraceTreeSnapshot.create(
        project_name="demo",
        traces=(),
        steps=(source,),
    )

    source.input["name"] = "mutated"

    assert snapshot.steps[0].input["name"] == "你好\ntrace"


def test_step_snapshot_copies_step_data():
    source = Step(
        name="step",
        id="step-1",
        trace_id=None,
        input={"name": "standalone"},
    )
    snapshot = StepSnapshot.create(project_name="demo", step=source)

    source.input["name"] = "mutated"

    assert snapshot.step.input["name"] == "standalone"
    assert snapshot.step.trace_id is None


def test_exports_snapshots_one_at_a_time():
    exported = []
    sent = threading.Event()

    def sender(item):
        exported.append(item)
        if len(exported) == 2:
            sent.set()

    exporter = Exporter(sender=sender)
    exporter.start()
    try:
        assert exporter.enqueue(snapshot(1))
        assert exporter.enqueue(snapshot(2))
        assert sent.wait(1)
        assert [item.project_name for item in exported] == [
            "project-1",
            "project-2",
        ]
    finally:
        assert exporter.close(timeout=1)


def test_sender_runs_off_the_application_thread():
    application_thread = threading.get_ident()
    sender_thread = None
    sent = threading.Event()

    def sender(item):
        nonlocal sender_thread
        sender_thread = threading.get_ident()
        sent.set()

    exporter = Exporter(sender=sender)
    exporter.start()
    try:
        assert exporter.enqueue(snapshot(1))
        assert sent.wait(1)
        assert sender_thread != application_thread
    finally:
        assert exporter.close(timeout=1)


def test_multiple_producers_share_one_consumer():
    exported = []
    consumer_threads = set()
    all_exported = threading.Event()

    def sender(item):
        exported.append(item)
        consumer_threads.add(threading.get_ident())
        if len(exported) == 16:
            all_exported.set()

    exporter = Exporter(sender=sender)
    exporter.start()
    snapshots = [snapshot(item_id) for item_id in range(16)]
    try:
        with ThreadPoolExecutor(max_workers=4) as producers:
            accepted = list(producers.map(exporter.enqueue, snapshots))

        assert all(accepted)
        assert all_exported.wait(1)
        assert sorted(item.project_name for item in exported) == sorted(
            item.project_name for item in snapshots
        )
        assert len(consumer_threads) == 1
    finally:
        assert exporter.close(timeout=1)


def test_queue_overflow_drops_newest_snapshot():
    sending = threading.Event()
    release = threading.Event()

    def sender(item):
        sending.set()
        release.wait(1)

    exporter = Exporter(
        max_queue_size=1,
        sender=sender,
    )
    exporter.start()
    try:
        assert exporter.enqueue(snapshot(1)) is True
        assert sending.wait(1)
        assert exporter.enqueue(snapshot(2)) is True
        assert exporter.enqueue(snapshot(3)) is False
        assert exporter.dropped_snapshots == 1
    finally:
        release.set()
        assert exporter.close(timeout=1)


def test_enqueue_does_not_start_exporter():
    exporter = Exporter(sender=lambda item: None)

    assert exporter.enqueue(snapshot(1)) is False
    assert exporter.is_running is False
    assert exporter.dropped_snapshots == 1
    assert exporter.close(timeout=1)


def test_default_exporter_is_process_singleton(monkeypatch):
    exporter_module.shutdown_exporter(timeout=1)
    monkeypatch.setattr(
        exporter_implementation,
        "_telemetry_sender",
        lambda item: None,
    )
    try:
        first = exporter_module.get_exporter()
        second = exporter_module.get_exporter()
        assert first is second
        assert first._consumer_thread is second._consumer_thread
    finally:
        assert exporter_module.shutdown_exporter(timeout=1)


def test_default_exporter_is_recreated_when_pid_changes(monkeypatch):
    exporter_module.shutdown_exporter(timeout=1)
    monkeypatch.setattr(
        exporter_implementation,
        "_telemetry_sender",
        lambda item: None,
    )
    pid = 100
    monkeypatch.setattr(exporter_implementation.os, "getpid", lambda: pid)

    first = exporter_module.get_exporter()
    pid = 200
    second = exporter_module.get_exporter()

    try:
        assert second is not first
        assert exporter_module.get_exporter() is second
    finally:
        assert exporter_module.shutdown_exporter(timeout=1)
        assert first.close(timeout=1)


def test_default_exporter_can_be_configured_without_starting_thread():
    exporter_module.shutdown_exporter(timeout=1)
    exporter_module.configure_exporter(
        max_queue_size=7,
    )

    created = exporter_module.get_exporter()
    try:
        assert created.max_queue_size == 7
    finally:
        assert exporter_module.shutdown_exporter(timeout=1)
        exporter_module.configure_exporter()
