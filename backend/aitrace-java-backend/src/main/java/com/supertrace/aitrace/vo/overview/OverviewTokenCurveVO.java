package com.supertrace.aitrace.vo.overview;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveData;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OverviewTokenCurveVO {
    private int windowHours;
    private String granularity;
    private List<Long> projectIds;
    private List<OverviewProjectTokenCurveVO> series;

    public static OverviewTokenCurveVO from(OverviewTokenCurveData data) {
        return OverviewTokenCurveVO.builder()
            .windowHours(data.windowHours())
            .granularity(data.granularity())
            .projectIds(data.projectIds())
            .series(data.series().stream().map(OverviewProjectTokenCurveVO::from).toList())
            .build();
    }
}
