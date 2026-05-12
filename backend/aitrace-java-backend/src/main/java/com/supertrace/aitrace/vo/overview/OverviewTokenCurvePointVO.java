package com.supertrace.aitrace.vo.overview;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurvePointData;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OverviewTokenCurvePointVO {
    private LocalDateTime bucketStart;
    private long tokens;

    public static OverviewTokenCurvePointVO from(OverviewTokenCurvePointData data) {
        return OverviewTokenCurvePointVO.builder()
            .bucketStart(data.bucketStart())
            .tokens(data.tokens())
            .build();
    }
}
