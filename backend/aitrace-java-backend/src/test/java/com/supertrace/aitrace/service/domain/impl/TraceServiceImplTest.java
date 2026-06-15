package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.factory.TraceFactory;
import com.supertrace.aitrace.repository.TraceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TraceServiceImplTest {
    @Mock
    private TraceRepository traceRepository;

    @Mock
    private TraceFactory traceFactory;

    @InjectMocks
    private TraceServiceImpl traceService;

    @Test
    void getConversationTraceTimeline_returnsRepositoryTimelineOrderedByStartTimeAsc() {
        UUID conversationId = UUID.randomUUID();
        Trace firstTrace = Trace.builder()
            .id(UUID.randomUUID())
            .projectId(7L)
            .conversationId(conversationId)
            .startTime(LocalDateTime.now())
            .build();
        Trace secondTrace = Trace.builder()
            .id(UUID.randomUUID())
            .projectId(7L)
            .conversationId(conversationId)
            .startTime(LocalDateTime.now().plusSeconds(1))
            .build();
        when(traceRepository.findTracesByProjectIdAndConversationIdOrderByStartTimeAsc(7L, conversationId))
            .thenReturn(List.of(firstTrace, secondTrace));

        List<Trace> result = traceService.getConversationTraceTimeline(7L, conversationId);

        assertEquals(List.of(firstTrace, secondTrace), result);
        verify(traceRepository).findTracesByProjectIdAndConversationIdOrderByStartTimeAsc(7L, conversationId);
    }
}
