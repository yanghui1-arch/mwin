package com.supertrace.aitrace.vo.overview;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.service.application.model.OverviewTopCostDriversData;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OverviewCostDriverVO {
    private String displayName;
    private BigDecimal cost;
    private long totalTokens;
    private long promptTokens;
    private long completionTokens;
    private String provider;
    private String model;
    private Long projectId;
    private String projectName;
    private String traceId;
    private String stepId;

    public static OverviewCostDriverVO from(OverviewTopCostDriversData.CostDriverData data) {
        return OverviewCostDriverVO.builder()
            .displayName(data.displayName())
            .cost(data.cost())
            .totalTokens(data.totalTokens())
            .promptTokens(data.promptTokens())
            .completionTokens(data.completionTokens())
            .provider(data.provider())
            .model(data.model())
            .projectId(data.projectId())
            .projectName(data.projectName())
            .traceId(data.traceId())
            .stepId(data.stepId())
            .build();
    }
}
