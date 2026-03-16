package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptMetricsVO {
    private long usageCount;
    private double avgLatencyMs;
    private double tokenCostPer1k;
    /** Reserved: populated from LLM-as-judge eval scores in the future. */
    private double successRate;

    public static PromptMetricsVO empty() {
        return PromptMetricsVO.builder().build();
    }
}
