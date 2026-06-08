package com.supertrace.aitrace.vo.conversation;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Data
@Builder
public class ConversationSummaryVO {
    private UUID conversationId;
    private long traceCount;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime lastUpdateTimestamp;

    private boolean hasError;
    private long durationMillis;
    private long totalTokens;
    private BigDecimal totalCost;

    public static ConversationSummaryVO from(ConversationSummaryData data) {
        return ConversationSummaryVO.builder()
            .conversationId(data.getConversationId())
            .traceCount(data.getTraceCount())
            .startTime(data.getStartTime())
            .lastUpdateTimestamp(data.getLastUpdateTimestamp())
            .hasError(data.getHasError())
            .durationMillis(data.getDurationMillis())
            .totalTokens(data.getTotalTokens())
            .totalCost(Optional.ofNullable(data.getTotalCost()).orElse(BigDecimal.ZERO))
            .build();
    }
}
