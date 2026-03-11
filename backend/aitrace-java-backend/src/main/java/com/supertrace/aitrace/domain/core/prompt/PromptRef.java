package com.supertrace.aitrace.domain.core.prompt;

import java.util.UUID;

/**
 * Carries the resolved prompt group ID and prompt version ID together,
 * so callers of {@code findOrCreatePrompt} can populate both fields of
 * a {@code StepRef} without a second lookup.
 *
 * @param promptGroupId   the UUID of the {@code PromptGroup}
 * @param promptVersionId the UUID of the specific {@code Prompt} version
 */
public record PromptRef(UUID promptGroupId, UUID promptVersionId) {}
