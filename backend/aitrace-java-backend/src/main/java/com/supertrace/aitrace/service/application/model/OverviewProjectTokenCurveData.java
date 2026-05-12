package com.supertrace.aitrace.service.application.model;

import java.util.List;

public record OverviewProjectTokenCurveData(
    Long projectId,
    String projectName,
    List<OverviewTokenCurvePointData> points
) {}
