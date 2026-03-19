package com.supertrace.aitrace.domain.core.prompt;

import java.util.UUID;

/**
 * Carries the resolved prompt pipeline ID and prompt version ID together,
 * so callers of {@code findOrCreatePrompt} can populate both fields of
 * a {@code StepRef} without a second lookup.
 *
 * @param promptPipelineId the UUID of the {@code PromptPipeline}
 * @param promptVersion  the name of the specific {@code Prompt} version
 */
public record PromptRef(UUID promptPipelineId, String promptVersion) {}
