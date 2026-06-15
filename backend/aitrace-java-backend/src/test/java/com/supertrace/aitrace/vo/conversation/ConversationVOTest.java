package com.supertrace.aitrace.vo.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.vo.PageVO;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ConversationVOTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void summary_allowsMissingAggregateData() throws Exception {
        UUID conversationId = UUID.randomUUID();
        ConversationSummaryVO summary = ConversationSummaryVO.builder()
            .conversationId(conversationId)
            .traceCount(0)
            .hasError(false)
            .totalTokens(0L)
            .build();

        assertEquals(conversationId, summary.getConversationId());
        assertEquals(0, summary.getTraceCount());
        assertFalse(summary.getHasError());
        assertNull(summary.getStartTime());
        assertNull(summary.getLastUpdatedAt());
        assertNull(summary.getTotalDurationMs());
        assertEquals(0L, summary.getTotalTokens());
        assertNull(summary.getTotalCost());
        assertTrue(objectMapper.writeValueAsString(summary).contains("conversationId"));
    }

    @Test
    void trace_containsConversationAggregateAndTimelineItems() {
        UUID conversationId = UUID.randomUUID();
        UUID traceId = UUID.randomUUID();
        LocalDateTime startedAt = LocalDateTime.of(2025, 1, 2, 3, 4, 5);
        ConversationTraceVO.TraceItemVO item = ConversationTraceVO.TraceItemVO.builder()
            .traceId(traceId)
            .name("llm-call")
            .hasError(true)
            .startTime(startedAt)
            .durationMs(12L)
            .totalTokens(34L)
            .cost(BigDecimal.valueOf(0.056))
            .build();

        ConversationTraceVO trace = ConversationTraceVO.builder()
            .conversationId(conversationId)
            .traceCount(1)
            .hasError(true)
            .startTime(startedAt)
            .totalDurationMs(12L)
            .totalTokens(34L)
            .totalCost(BigDecimal.valueOf(0.056))
            .traces(List.of(item))
            .build();

        assertEquals(conversationId, trace.getConversationId());
        assertTrue(trace.getHasError());
        assertEquals(1, trace.getTraceCount());
        assertEquals(traceId, trace.getTraces().get(0).getTraceId());
        assertEquals(BigDecimal.valueOf(0.056), trace.getTotalCost());
    }

    @Test
    void page_wrapsConversationResponseList() {
        ConversationSummaryVO summary = ConversationSummaryVO.builder()
            .conversationId(UUID.randomUUID())
            .traceCount(0)
            .hasError(false)
            .build();
        PageVO<ConversationSummaryVO> page = PageVO.<ConversationSummaryVO>builder()
            .pageCount(1)
            .data(List.of(summary))
            .build();

        ConversationPageVO<ConversationSummaryVO> conversationPage = ConversationPageVO.from(page);

        assertEquals(1, conversationPage.getPageCount());
        assertEquals(List.of(summary), conversationPage.getData());
    }
}
