package com.supertrace.aitrace.service.application.model;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TraceSummary(
    UUID id,
    UUID parentTraceId,
    String name,
    List<String> tags,
    String errorInfo,
    LocalDateTime startTime,
    LocalDateTime lastUpdateTimestamp,
    /** Raw payload size in bytes; never null (the payload object is required). */
    @NotNull Long payloadSize,
    /** Steps recorded inside this trace; never null (always at least 0). */
    @NotNull Long stepCount
) {
}
