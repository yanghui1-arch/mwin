package com.supertrace.aitrace.vo.overview;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.service.application.model.OverviewSummaryData;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OverviewSummaryVO {
    private int trackedProjectCount;
    private long lifetimeTotalTokens;
    private long yesterdayTotalTokens;
    private long todayTotalTokens;
    private Double todayChangePct;
    private Double yesterdayChangePct;

    public static OverviewSummaryVO from(OverviewSummaryData data) {
        return OverviewSummaryVO.builder()
            .trackedProjectCount(data.trackedProjectCount())
            .lifetimeTotalTokens(data.lifetimeTotalTokens())
            .yesterdayTotalTokens(data.yesterdayTotalTokens())
            .todayTotalTokens(data.todayTotalTokens())
            .todayChangePct(data.todayChangePct())
            .yesterdayChangePct(data.yesterdayChangePct())
            .build();
    }
}
