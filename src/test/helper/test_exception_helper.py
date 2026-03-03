"""Tests for collect_exception in exception_helper."""

import pytest

from mwin.helper.exception_helper import MAX_EXCEPTION_LENGTH, _TRUNCATE_KEEP, collect_exception


def test_short_exception_collected_fully():
    exc = "ValueError: invalid value\nTraceback line 1\nTraceback line 2"
    result = collect_exception(exc)
    assert result == exc
    assert len(result) <= MAX_EXCEPTION_LENGTH


def test_exact_boundary_collected_fully():
    exc = "x" * MAX_EXCEPTION_LENGTH
    result = collect_exception(exc)
    assert result == exc


def test_long_exception_collects_latest_complete_lines():
    lines = [f"Error {i}: something went wrong in module_{i}" for i in range(100)]
    exc = "\n".join(lines)
    result = collect_exception(exc)

    assert len(result) <= MAX_EXCEPTION_LENGTH
    for line in result.splitlines():
        assert line in lines, f"partial line detected: {line!r}"


def test_long_exception_contains_latest_errors():
    lines = [f"Error {i}: something went wrong in module_{i}" for i in range(100)]
    exc = "\n".join(lines)
    result = collect_exception(exc)

    result_lines = result.splitlines()
    assert result_lines[-1] == "Error 99: something went wrong in module_99"


def test_single_line_exceeding_limit_is_truncated():
    exc = "E: " + "a" * 300
    result = collect_exception(exc)

    omitted = len(exc) - _TRUNCATE_KEEP
    expected = f"{exc[:_TRUNCATE_KEEP]}[...{omitted} characters]"
    assert result == expected
    assert len(result) <= MAX_EXCEPTION_LENGTH


def test_exception_object_is_accepted():
    exc = ValueError("something went wrong")
    result = collect_exception(exc)
    assert result == str(exc)
    assert len(result) <= MAX_EXCEPTION_LENGTH
