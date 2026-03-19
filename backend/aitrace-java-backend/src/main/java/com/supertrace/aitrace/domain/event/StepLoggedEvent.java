package com.supertrace.aitrace.domain.event;

import java.util.UUID;

/**
 * Published by StepServiceImpl after an LLM step is enriched with output.
 * Consumed by the eval application service to enqueue a background eval job.
 */
public record StepLoggedEvent(UUID stepId, UUID traceId, Long projectId, String promptVersion) {}
