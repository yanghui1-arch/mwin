package com.supertrace.aitrace.dto.step;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class StepSearchCriteria {
    LocalDateTime startTimeFrom;
    LocalDateTime startTimeTo;
    Boolean hasError;
    String tag;
    String keyword;
    Long minDurationMs;
    Long maxDurationMs;
    String type;
    String model;
    Long minTotalTokens;
    Long maxTotalTokens;

    public static StepSearchCriteria empty() {
        return StepSearchCriteria.builder().build();
    }
}
