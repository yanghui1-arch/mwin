package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.factory.TraceFactory;
import com.supertrace.aitrace.repository.TraceRepository;
import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TraceServiceImplTest {
    @Mock
    private TraceRepository traceRepository;

    @Mock
    private TraceFactory traceFactory;

    @InjectMocks
    private TraceServiceImpl service;

    @Test
    void getConversationSummariesByProjectId_passesPaginationToRepository() {
        ConversationSummaryData summary = mock(ConversationSummaryData.class);
        when(traceRepository.findConversationSummariesByProjectId(eq(7L), any()))
            .thenReturn(new PageImpl<>(List.of(summary)));

        Page<ConversationSummaryData> result = service.getConversationSummariesByProjectId(7L, 3, 4);

        assertEquals(1, result.getTotalElements());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(traceRepository).findConversationSummariesByProjectId(eq(7L), pageableCaptor.capture());
        assertEquals(3, pageableCaptor.getValue().getPageNumber());
        assertEquals(4, pageableCaptor.getValue().getPageSize());
    }

    @Test
    void getConversationTraceTimeline_queriesByProjectAndConversationOnly() {
        UUID conversationId = UUID.randomUUID();
        Trace trace = Trace.builder().id(UUID.randomUUID()).conversationId(conversationId).projectId(7L).build();
        when(traceRepository.findTracesByProjectIdAndConversationIdOrderByStartTimeAsc(7L, conversationId))
            .thenReturn(List.of(trace));

        List<Trace> result = service.getConversationTraceTimeline(7L, conversationId);

        assertEquals(List.of(trace), result);
        verify(traceRepository).findTracesByProjectIdAndConversationIdOrderByStartTimeAsc(7L, conversationId);
    }
}
