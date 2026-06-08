package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.vo.conversation.ConversationVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConversationControllerTest {
    private MockMvc mockMvc;
    private QueryService queryService;
    private UUID userId;

    @BeforeEach
    void setUp() {
        queryService = mock(QueryService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new ConversationController(queryService)).build();
        userId = UUID.randomUUID();
    }

    @Test
    void getConversations_returnsPagedUnifiedResponse() throws Exception {
        UUID conversationId = UUID.randomUUID();
        ConversationVO conversation = ConversationVO.builder()
            .id(conversationId)
            .traceCount(2)
            .startTime(LocalDateTime.now())
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
        when(queryService.getConversations(userId, "demo", 1, 5))
            .thenReturn(new PageImpl<>(List.of(conversation)));

        mockMvc.perform(get("/api/v0/conversations/demo")
                .requestAttr("userId", userId)
                .param("page", "1")
                .param("pageSize", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.data[0].id").value(conversationId.toString()))
            .andExpect(jsonPath("$.data.data[0].traceCount").value(2));
    }

    @Test
    void getConversationTraces_returnsPagedUnifiedResponse() throws Exception {
        UUID conversationId = UUID.randomUUID();
        UUID traceId = UUID.randomUUID();
        Trace trace = Trace.builder()
            .id(traceId)
            .projectName("demo")
            .projectId(7L)
            .name("trace")
            .conversationId(conversationId)
            .tags(List.of("agent"))
            .startTime(LocalDateTime.now())
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
        when(queryService.getConversationTraces(userId, "demo", conversationId, 0, 10))
            .thenReturn(new PageImpl<>(List.of(trace)));

        mockMvc.perform(get("/api/v0/conversations/demo/{conversationId}/traces", conversationId)
                .requestAttr("userId", userId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.data[0].id").value(traceId.toString()))
            .andExpect(jsonPath("$.data.data[0].name").value("trace"));
    }

    @Test
    void getConversationTraces_missingOrUnauthorizedDoesNotLeakData() throws Exception {
        UUID conversationId = UUID.randomUUID();
        when(queryService.getConversationTraces(eq(userId), eq("demo"), eq(conversationId), eq(0), eq(10)))
            .thenThrow(new RuntimeException("Conversation not found"));

        mockMvc.perform(get("/api/v0/conversations/demo/{conversationId}/traces", conversationId)
                .requestAttr("userId", userId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value(404))
            .andExpect(jsonPath("$.message").value("Conversation not found"))
            .andExpect(jsonPath("$.data").doesNotExist());
    }
}
