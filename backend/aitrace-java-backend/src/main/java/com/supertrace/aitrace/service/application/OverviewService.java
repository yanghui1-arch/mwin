package com.supertrace.aitrace.service.application;

import com.supertrace.aitrace.service.application.model.OverviewSummaryData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveQuery;
import com.supertrace.aitrace.service.application.model.OverviewTopCostDriversData;

import java.util.UUID;

public interface OverviewService {
    OverviewSummaryData getSummary(UUID userId);

    OverviewTokenCurveData getTokenCurve(UUID userId, OverviewTokenCurveQuery query);

    OverviewTopCostDriversData getTopCostDrivers(UUID userId, int windowHours, int limit);
}
