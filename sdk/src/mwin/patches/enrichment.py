"""Provider-independent in-memory enrichment for tracked LLM steps."""

from collections.abc import Mapping
from datetime import datetime

from openai.types.completion_usage import CompletionUsage

from ..helper.llm import provider_helper
from ..models import Step
from ..track.options import TrackerOptions


def enrich_step(
    *,
    step: Step,
    llm_inputs: Mapping[str, object],
    llm_outputs: object,
    model: str | None,
    usage: CompletionUsage | None,
    tracker_options: TrackerOptions,
) -> None:
    """Merge provider data into the tracked in-memory step.

    Provider patches call this function to update the same Step object
    created by the tracker. The completed Step is later deep-copied into a
    ``TraceTreeSnapshot`` and exported once with its trace tree.

    Enrichment must therefore finish before the snapshot is created. This is
    particularly important for streaming responses: consuming a stream after
    its root trace has already produced a snapshot cannot update that existing
    snapshot.

    This function is provider-independent so OpenAI and future provider
    patches share the same merge behavior.

    Args:
        step: In-memory Step object created and managed by the tracker.
        llm_inputs: Provider request parameters to store under
            ``step.input["llm_inputs"]``.
        llm_outputs: Provider response data to store under
            ``step.output["llm_outputs"]``.
        model: Model reported by or passed to the provider, if available.
        usage: Token usage reported by the provider, if available.
        tracker_options: Tracker configuration used to populate the Step
            description and resolved LLM provider.
    """

    current_input = step.input
    if isinstance(current_input, dict) and "func_inputs" in current_input:
        combined_input = dict(current_input)
    else:
        combined_input = {"func_inputs": current_input}
    combined_input["llm_inputs"] = llm_inputs
    step.input = combined_input

    combined_output = dict(step.output or {})
    combined_output["llm_outputs"] = llm_outputs
    step.output = combined_output

    if model is not None and model not in step.tags:
        step.tags = [*step.tags, model]
    step.model = model
    step.usage = usage
    step.end_time = datetime.now()
    step.description = tracker_options.description
    step.llm_provider = provider_helper.resolve_llm_provider(
        tracker_options.llm_provider,
        model,
    ).value
