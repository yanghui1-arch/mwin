package com.supertrace.aitrace.service.application.model;

import java.time.LocalDateTime;

public record OverviewTokenCurvePointData(LocalDateTime bucketStart, long tokens) {}
