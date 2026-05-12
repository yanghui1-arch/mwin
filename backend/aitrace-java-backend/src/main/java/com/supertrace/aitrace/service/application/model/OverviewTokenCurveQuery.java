package com.supertrace.aitrace.service.application.model;

import java.util.List;

public record OverviewTokenCurveQuery(int windowHours, List<Long> projectIds) {}
