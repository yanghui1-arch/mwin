package com.supertrace.aitrace.service.application.model;

import com.supertrace.aitrace.domain.core.usage.LLMUsage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Read-only projection used by Step list and track queries.
 * It excludes the large input/output payload and is not a domain entity.
 */
public record StepSummary(
    UUID id,
    UUID parentStepId,
    String name,
    String type,
    List<String> tags,
    String errorInfo,
    String model,
    LLMUsage usage,
    LocalDateTime startTime,
    LocalDateTime endTime,
    Long payloadSize
) {
}
