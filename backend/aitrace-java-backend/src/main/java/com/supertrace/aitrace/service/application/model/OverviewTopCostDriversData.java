package com.supertrace.aitrace.service.application.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OverviewTopCostDriversData(
    int windowHours,
    LocalDateTime startTime,
    LocalDateTime endTime,
    List<CostDriverData> projects,
    List<CostDriverData> models,
    List<CostDriverData> traces,
    List<CostDriverData> steps
) {
    public record CostDriverData(
        String displayName,
        BigDecimal cost,
        long totalTokens,
        long promptTokens,
        long completionTokens,
        String provider,
        String model,
        Long projectId,
        String projectName,
        String traceId,
        String stepId
    ) {}
}
