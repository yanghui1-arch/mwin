package com.supertrace.aitrace.vo.overview;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.service.application.model.OverviewTopCostDriversData;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OverviewTopCostDriversVO {
    private int windowHours;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private List<OverviewCostDriverVO> projects;
    private List<OverviewCostDriverVO> models;
    private List<OverviewCostDriverVO> traces;
    private List<OverviewCostDriverVO> steps;

    public static OverviewTopCostDriversVO from(OverviewTopCostDriversData data) {
        return OverviewTopCostDriversVO.builder()
            .windowHours(data.windowHours())
            .startTime(data.startTime())
            .endTime(data.endTime())
            .projects(data.projects().stream().map(OverviewCostDriverVO::from).toList())
            .models(data.models().stream().map(OverviewCostDriverVO::from).toList())
            .traces(data.traces().stream().map(OverviewCostDriverVO::from).toList())
            .steps(data.steps().stream().map(OverviewCostDriverVO::from).toList())
            .build();
    }
}
