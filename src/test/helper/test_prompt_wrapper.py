from mwin import template_prompt


def test_prompt_add_str_keeps_wrapper_and_metadata():
    prompt = template_prompt(
        "Hello {name}",
        version="1.0",
        pipeline="unit-pipeline",
        prompt_name="greeting",
    )

    combined = prompt + "!"

    assert isinstance(combined, prompt.__class__)
    assert combined == "Hello {name}!"
    assert combined._original_template == "Hello {name}!"
    assert combined._version == "1.0"
    assert combined._pipeline == "unit-pipeline"
    assert combined._prompt_name == "greeting"


def test_str_radd_prompt_keeps_wrapper_and_metadata():
    prompt = template_prompt(
        "world",
        version="2.0",
        pipeline="unit-pipeline",
        prompt_name="planet",
    )

    combined = "hello " + prompt

    assert isinstance(combined, prompt.__class__)
    assert combined == "hello world"
    assert combined._original_template == "hello world"
    assert combined._version == "2.0"
    assert combined._pipeline == "unit-pipeline"
    assert combined._prompt_name == "planet"


def test_formatted_prompt_add_str_preserves_template_chain():
    prompt = template_prompt(
        "You are {role}",
        version="3.0",
        pipeline="unit-pipeline",
        prompt_name="role",
    )

    formatted = prompt.format(role="assistant")
    combined = formatted + "."

    assert isinstance(combined, prompt.__class__)
    assert combined == "You are assistant."
    assert combined._original_template == "You are {role}."
    assert combined._version == "3.0"
    assert combined._pipeline == "unit-pipeline"
    assert combined._prompt_name == "role"
