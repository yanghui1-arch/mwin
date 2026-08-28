package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import com.supertrace.aitrace.service.domain.ProjectService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QueryServiceImplTest {

    @Mock
    private StepService stepService;

    @Mock
    private TraceService traceService;

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private QueryServiceImpl service;

    private UUID userId;
    private Project project;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        project = Project.builder()
            .id(7L)
            .userId(userId)
            .name("my-project")
            .cost(BigDecimal.ZERO)
            .averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
    }

    // ── getSteps ──────────────────────────────────────────────────────────────

    @Test
    void getSteps_returnsTheRequestedSummaryPageSortedByNewestFirst() {
        StepSummary step = new StepSummary(
            UUID.randomUUID(), null, "s", "llm_response", List.of(), null,
            null, null, LocalDateTime.now(), LocalDateTime.now(), 128L
        );
        Page<StepSummary> page = new PageImpl<>(List.of(step));

        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(stepService.findStepSummariesByProjectId(eq(7L), eq(0), eq(15), any(Sort.class)))
            .thenReturn(page);

        Page<StepSummary> result = service.getSteps(userId, "my-project", 0, 15);

        assertEquals(1, result.getTotalElements());
        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(stepService).findStepSummariesByProjectId(eq(7L), eq(0), eq(15), sortCaptor.capture());

        Sort.Order order = sortCaptor.getValue().getOrderFor("startTime");
        assertNotNull(order);
        assertEquals(Sort.Direction.DESC, order.getDirection());
    }

    @Test
    void getSteps_projectNotFound_throwsRuntimeException() {
        when(projectService.getProjectByUserIdAndName(userId, "missing"))
            .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.getSteps(userId, "missing", 0, 10));

        assertTrue(ex.getMessage().contains("missing"));
    }

    // ── getTraces ─────────────────────────────────────────────────────────────

    @Test
    void getTraces_returnsTheRequestedSummaryPageSortedByNewestFirst() {
        TraceSummary trace = new TraceSummary(
            UUID.randomUUID(), null, "t1", List.of(), null,
            LocalDateTime.now(), LocalDateTime.now(), 256L, 3L
        );
        Page<TraceSummary> page = new PageImpl<>(List.of(trace));

        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(traceService.getTraceSummariesByProjectId(eq(7L), eq(0), eq(10), any(Sort.class)))
            .thenReturn(page);

        Page<TraceSummary> result = service.getTraces(userId, "my-project", 0, 10);

        assertEquals(1, result.getTotalElements());
        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(traceService).getTraceSummariesByProjectId(eq(7L), eq(0), eq(10), sortCaptor.capture());

        Sort.Order order = sortCaptor.getValue().getOrderFor("startTime");
        assertNotNull(order);
        assertEquals(Sort.Direction.DESC, order.getDirection());
    }

    @Test
    void getTraces_projectNotFound_throwsRuntimeException() {
        when(projectService.getProjectByUserIdAndName(userId, "ghost"))
            .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.getTraces(userId, "ghost", 0, 10));

        assertTrue(ex.getMessage().contains("ghost"));
    }
}
