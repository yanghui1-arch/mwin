from typing import Tuple


def parse_system_prompt_identifier(system_prompt: str | None) -> Tuple[str | None, str | None, str | None]:
    """Parse system prompt identifier in `pipeline/name@version` format.

    Returns `(pipeline, prompt_name, prompt_version)`.
    Returns `(None, None, None)` when `system_prompt` is None.
    """

    if system_prompt is None:
        return None, None, None

    identifier = system_prompt.strip()
    if not identifier or identifier.count("@") != 1:
        raise ValueError("Invalid system_prompt. Expected format: pipeline/name@version")

    path, prompt_version = identifier.rsplit("@", 1)
    if not prompt_version or "/" not in path:
        raise ValueError("Invalid system_prompt. Expected format: pipeline/name@version")

    pipeline, prompt_name = path.split("/", 1)
    if not pipeline or not prompt_name:
        raise ValueError("Invalid system_prompt. Expected format: pipeline/name@version")

    return pipeline, prompt_name, prompt_version
