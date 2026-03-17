from typing import Any, Sequence


class _MwinPromptStr(str):
    """String subclass that carries the original unformatted prompt template.

    Fully compatible with str — the LLM receives the formatted value as usual.
    The mwin patches read _original_template to log the template, not the
    rendered result.

    Formatting methods (format, format_map, %) return a new _MwinPromptStr
    that preserves _original_template so the chain is never broken.
    """

    _original_template: str
    _version: str
    _pipeline: str

    def __new__(cls, value: str, version: str, pipeline: str, original_template: str = None) -> "_MwinPromptStr":
        instance = super().__new__(cls, value)
        # If original_template is not supplied, this instance IS the template
        instance._original_template = original_template if original_template is not None else str(value)
        instance._version = version
        instance._pipeline = pipeline
        return instance

    def format(self, *args: Any, **kwargs: Any) -> "_MwinPromptStr":
        """Format and return a new _MwinPromptStr, preserving the original template."""
        formatted = str.format(self, *args, **kwargs)
        return _MwinPromptStr(
            formatted,
            original_template=self._original_template,
            version=self._version,
            pipeline=self._pipeline
        )

    def format_map(self, mapping: Any) -> "_MwinPromptStr":
        """format_map variant — also preserves the original template."""
        formatted = str.format_map(self, mapping)
        return _MwinPromptStr(
            formatted,
            original_template=self._original_template,
            version=self._version,
            pipeline=self._pipeline
        )

    def __mod__(self, args: Any) -> "_MwinPromptStr":
        """%-style formatting — also preserves the original template."""
        formatted = str.__mod__(self, args)
        return _MwinPromptStr(
            formatted,
            original_template=self._original_template,
            version=self._version,
            pipeline=self._pipeline,
        )
    
    @property
    def version(self):
        return self._version


def template_prompt(system_prompt: str, version: str, pipeline: str) -> "_MwinPromptStr":
    """Wrap a system prompt template so mwin can log the original template.

    Call this with the unformatted template string. Then call .format() (or
    format_map / % interpolation) on the returned value to fill in variables.
    The LLM receives the fully-formatted string; mwin logs the original template.

    Usage::

        # Template captured before formatting
        SYSTEM = template_prompt("You are {role}. Project: {project}")

        @track(prompt="my_prompt")
        def call_llm(role: str, project: str):
            system = SYSTEM.format(role=role, project=project)
            # LLM sees: "You are assistant. Project: foo"
            # mwin logs: "You are {role}. Project: {project}"
            client.create(messages=[{"role": "system", "content": system}, ...])
    """
    return _MwinPromptStr(system_prompt, version=version, pipeline=pipeline)


def extract_system_prompt_from_messages(messages: Sequence) -> _MwinPromptStr | None:
    """Scan a messages list for a system message wrapped with mwin_prompt().

    Returns the _original_template (unformatted) of the first system-role
    message whose content is a _MwinPromptStr. Returns None if not found.
    """
    if not messages:
        return None
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        if msg.get("role") == "system":
            content = msg.get("content")
            if isinstance(content, _MwinPromptStr):
                return content
    return None
