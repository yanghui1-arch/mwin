package com.supertrace.aitrace.service.application.model;

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
    LocalDateTime lastUpdateTimestamp
) {
}
