"""Test track decorator with project_name parameter."""

from mwin import track


# Define a function with project_name
@track(tags=["test"], project_name="test-project")
def sample_function(x, y):
    """Sample function for testing."""
    return x + y

def test_track_with_project_name(fake_client):
    """A standalone Step retains its selected project."""

    # Call the function
    result = sample_function(1, 2)

    # Verify the function executed correctly
    assert result == 3

    # Verify that only the standalone Step was logged
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 0

    # Verify step details
    step = fake_client.steps[0]
    assert step["project_name"] == "test-project"
    assert step["step_name"] == "sample_function"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == 3
    assert step["tags"] == ["test"]


def test_track_without_project_name(fake_client):
    """A missing project name is resolved when the request is built."""

    # Define a function without project_name
    @track(tags=["test"])
    def sample_function(x):
        return x * 2

    # Call the function
    result = sample_function(5)

    # Verify the function executed correctly
    assert result == 10

    # Verify that only the standalone Step was logged
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 0
    assert fake_client.steps[0]["project_name"]


def test_track_different_project_names(fake_client):
    """Independent Step snapshots can target different projects."""

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

    # Verify that only the standalone Steps were logged
    assert len(fake_client.steps) == 2
    assert len(fake_client.traces) == 0
    assert fake_client.steps[0]["project_name"] == "project-a"
    assert fake_client.steps[1]["project_name"] == "project-b"
