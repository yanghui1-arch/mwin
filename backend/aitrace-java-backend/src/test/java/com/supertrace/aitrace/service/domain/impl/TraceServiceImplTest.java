package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.factory.TraceFactory;
import com.supertrace.aitrace.repository.TraceRepository;
import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
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
    void getConversationSummariesByProjectId_returnsRepositoryPage() {
        ConversationSummaryData summary = mock(ConversationSummaryData.class);
        Page<ConversationSummaryData> expected = new PageImpl<>(List.of(summary));
        when(traceRepository.findConversationSummariesByProjectId(any(), any(Pageable.class))).thenReturn(expected);

        Page<ConversationSummaryData> result = service.getConversationSummariesByProjectId(9L, 1, 25);

        assertEquals(expected, result);
        verify(traceRepository).findConversationSummariesByProjectId(any(), any(Pageable.class));
    }
}
