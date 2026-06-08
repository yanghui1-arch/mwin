package com.supertrace.aitrace.dto.trace;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class TraceSearchCriteria {
    LocalDateTime startTimeFrom;
    LocalDateTime startTimeTo;
    Boolean hasError;
    String tag;
    String keyword;
    Long minDurationMs;
    Long maxDurationMs;

    public static TraceSearchCriteria empty() {
        return TraceSearchCriteria.builder().build();
    }
}
