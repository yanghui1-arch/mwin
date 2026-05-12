package com.supertrace.aitrace.service.application.model;

public record OverviewSummaryData(
    int trackedProjectCount,
    long lifetimeTotalTokens,
    long yesterdayTotalTokens,
    long todayTotalTokens,
    Double todayChangePct,
    Double yesterdayChangePct
) {}
