package com.supertrace.aitrace.vo.conversation;

import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ConversationSummaryVOTest {
    @Test
    void from_mapsBasicAggregateFields() {
        UUID conversationId = UUID.randomUUID();
        LocalDateTime startTime = LocalDateTime.now().minusMinutes(5);
        LocalDateTime lastUpdate = LocalDateTime.now();
        ConversationSummaryData data = new StubSummary(
            conversationId, 3, startTime, lastUpdate, true, 1200L, 42L, new BigDecimal("0.123456")
        );

        ConversationSummaryVO vo = ConversationSummaryVO.from(data);

        assertEquals(conversationId, vo.getConversationId());
        assertEquals(3, vo.getTraceCount());
        assertEquals(startTime, vo.getStartTime());
        assertEquals(lastUpdate, vo.getLastUpdateTimestamp());
        assertEquals(1200L, vo.getDurationMillis());
        assertEquals(42L, vo.getTotalTokens());
        assertEquals(new BigDecimal("0.123456"), vo.getTotalCost());
    }

    @Test
    void from_missingTokenAndCostValuesRespondStably() {
        ConversationSummaryData data = new StubSummary(
            UUID.randomUUID(), 1, LocalDateTime.now(), LocalDateTime.now(), false, 0L, 0L, null
        );

        ConversationSummaryVO vo = ConversationSummaryVO.from(data);

        assertFalse(vo.isHasError());
        assertEquals(0L, vo.getDurationMillis());
        assertEquals(0L, vo.getTotalTokens());
        assertEquals(BigDecimal.ZERO, vo.getTotalCost());
    }

    private record StubSummary(
        UUID conversationId,
        long traceCount,
        LocalDateTime startTime,
        LocalDateTime lastUpdateTimestamp,
        boolean hasError,
        long durationMillis,
        long totalTokens,
        BigDecimal totalCost
    ) implements ConversationSummaryData {
        @Override
        public UUID getConversationId() {
            return conversationId;
        }

        @Override
        public long getTraceCount() {
            return traceCount;
        }

        @Override
        public LocalDateTime getStartTime() {
            return startTime;
        }

        @Override
        public LocalDateTime getLastUpdateTimestamp() {
            return lastUpdateTimestamp;
        }

        @Override
        public boolean getHasError() {
            return hasError;
        }

        @Override
        public long getDurationMillis() {
            return durationMillis;
        }

        @Override
        public long getTotalTokens() {
            return totalTokens;
        }

        @Override
        public BigDecimal getTotalCost() {
            return totalCost;
        }
    }
}
