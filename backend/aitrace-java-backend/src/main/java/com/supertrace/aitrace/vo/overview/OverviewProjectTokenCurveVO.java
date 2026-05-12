package com.supertrace.aitrace.vo.overview;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.service.application.model.OverviewProjectTokenCurveData;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OverviewProjectTokenCurveVO {
    private Long projectId;
    private String projectName;
    private List<OverviewTokenCurvePointVO> points;

    public static OverviewProjectTokenCurveVO from(OverviewProjectTokenCurveData data) {
        return OverviewProjectTokenCurveVO.builder()
            .projectId(data.projectId())
            .projectName(data.projectName())
            .points(data.points().stream().map(OverviewTokenCurvePointVO::from).toList())
            .build();
    }
}
