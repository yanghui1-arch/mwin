package com.supertrace.aitrace.vo.conversation;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ConversationTraceVO {
    private UUID conversationId;
    private Integer traceCount;
    private Boolean hasError;
    private LocalDateTime startTime;
    private LocalDateTime lastUpdatedAt;
    private Long totalDurationMs;
    private Long totalTokens;
    private BigDecimal totalCost;
    private List<TraceItemVO> traces;

    @Data
    @Builder
    public static class TraceItemVO {
        private UUID traceId;
        private String name;
        private Boolean hasError;
        private LocalDateTime startTime;
        private LocalDateTime lastUpdatedAt;
        private Long durationMs;
        private Long totalTokens;
        private BigDecimal cost;
    }
}
