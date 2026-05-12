package com.supertrace.aitrace.service.application.model;

import java.util.List;

public record OverviewTokenCurveData(
    int windowHours,
    String granularity,
    List<Long> projectIds,
    List<OverviewProjectTokenCurveData> series
) {}
