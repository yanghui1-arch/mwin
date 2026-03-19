package com.supertrace.aitrace.domain.core.prompt;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PromptMetrics {
    // TODO: replace usageCount with requestCounts.
    long usageCount;
    double avgLatencyMs;
    double tokenCostPer1k;
    double successRate;

    public static PromptMetrics empty() {
        return PromptMetrics.builder().build();
    }
}
