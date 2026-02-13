"""Test track decorator with project_name parameter."""

import pytest

from mwin import track


# Define a function with project_name
@track(tags=["test"], project_name="test-project")
def sample_function(x, y):
    """Sample function for testing."""
    return x + y

def test_track_with_project_name(fake_client, monkeypatch):
    """Test that @track(project_name='xxx') correctly passes project_name to get_cached_sync_client."""

    # Track calls to get_cached_sync_client to verify project_name is passed
    get_client_calls = []

    def mock_get_cached_sync_client(**kwargs):
        get_client_calls.append(kwargs)
        return fake_client

    # Patch the get_cached_sync_client function
    monkeypatch.setattr(
        "mwin.client.sync_client.get_cached_sync_client",
        mock_get_cached_sync_client,
    )

    # Call the function
    result = sample_function(1, 2)

    # Verify the function executed correctly
    assert result == 3

    # Verify that get_cached_sync_client was called with the correct project_name
    assert len(get_client_calls) == 1
    assert get_client_calls[0]["project_name"] == "test-project"

    # Verify that steps and traces were logged
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1

    # Verify step details
    step = fake_client.steps[0]
    assert step["step_name"] == "sample_function"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == 3
    assert step["tags"] == ["test"]


def test_track_without_project_name(fake_client, monkeypatch):
    """Test that @track() without project_name passes None."""

    # Track calls to get_cached_sync_client
    get_client_calls = []

    def mock_get_cached_sync_client(**kwargs):
        get_client_calls.append(kwargs)
        return fake_client

    # Patch the get_cached_sync_client function
    monkeypatch.setattr(
        "mwin.client.sync_client.get_cached_sync_client",
        mock_get_cached_sync_client,
    )

    # Define a function without project_name
    @track(tags=["test"])
    def sample_function(x):
        return x * 2

    # Call the function
    result = sample_function(5)

    # Verify the function executed correctly
    assert result == 10

    # Verify that get_cached_sync_client was called with project_name=None
    assert len(get_client_calls) == 1
    assert get_client_calls[0]["project_name"] is None

    # Verify that steps and traces were logged
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1


def test_track_different_project_names(fake_client, monkeypatch):
    """Test that different project_names are correctly passed for different functions."""

    # Track calls to get_cached_sync_client
    get_client_calls = []

    def mock_get_cached_sync_client(**kwargs):
        get_client_calls.append(kwargs)
        return fake_client

    # Patch the get_cached_sync_client function
    monkeypatch.setattr(
        "mwin.client.sync_client.get_cached_sync_client",
        mock_get_cached_sync_client,
    )

    # Define functions with different project names
    @track(tags=["project-a"], project_name="project-a")
    def function_a():
        return "a"

    @track(tags=["project-b"], project_name="project-b")
    def function_b():
        return "b"

    # Call both functions
    result_a = function_a()
    result_b = function_b()

    # Verify results
    assert result_a == "a"
    assert result_b == "b"

    # Verify that get_cached_sync_client was called twice with different project names
    assert len(get_client_calls) == 2
    assert get_client_calls[0]["project_name"] == "project-a"
    assert get_client_calls[1]["project_name"] == "project-b"

    # Verify that steps and traces were logged
    assert len(fake_client.steps) == 2
    assert len(fake_client.traces) == 2
