package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.step.Step;
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
import java.util.ArrayList;
import java.util.HashMap;
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
    void getSteps_projectFound_returnsStepPageSortedByStartTimeDesc() {
        Step step = Step.builder()
            .id(UUID.randomUUID()).name("s").traceId(UUID.randomUUID())
            .type("llm_response").tags(new ArrayList<>()).input(new HashMap<>())
            .projectName("my-project").projectId(7L).startTime(LocalDateTime.now())
            .build();
        Page<Step> page = new PageImpl<>(List.of(step));

        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(stepService.findStepsByProjectId(eq(7L), eq(0), eq(15), any(Sort.class)))
            .thenReturn(page);

        Page<Step> result = service.getSteps(userId, "my-project", 0, 15);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getSteps_usesDescendingStartTimeSortOrder() {
        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(stepService.findStepsByProjectId(eq(7L), anyInt(), anyInt(), any(Sort.class)))
            .thenReturn(Page.empty());

        service.getSteps(userId, "my-project", 0, 10);

        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(stepService).findStepsByProjectId(eq(7L), anyInt(), anyInt(), sortCaptor.capture());

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

    @Test
    void getSteps_pageAndSizeArePassedToStepService() {
        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(stepService.findStepsByProjectId(anyLong(), anyInt(), anyInt(), any(Sort.class)))
            .thenReturn(Page.empty());

        service.getSteps(userId, "my-project", 3, 25);

        verify(stepService).findStepsByProjectId(eq(7L), eq(3), eq(25), any(Sort.class));
    }

    // ── getTraces ─────────────────────────────────────────────────────────────

    @Test
    void getTraces_projectFound_returnsTracePage() {
        Trace trace = Trace.builder()
            .id(UUID.randomUUID()).projectName("my-project").projectId(7L)
            .name("t1").conversationId(UUID.randomUUID()).tags(List.of())
            .startTime(LocalDateTime.now()).lastUpdateTimestamp(LocalDateTime.now())
            .build();
        Page<Trace> page = new PageImpl<>(List.of(trace));

        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(traceService.getTracesByProjectId(eq(7L), eq(0), eq(10), any(Sort.class)))
            .thenReturn(page);

        Page<Trace> result = service.getTraces(userId, "my-project", 0, 10);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getTraces_usesDescendingStartTimeSortOrder() {
        when(projectService.getProjectByUserIdAndName(userId, "my-project"))
            .thenReturn(Optional.of(project));
        when(traceService.getTracesByProjectId(anyLong(), anyInt(), anyInt(), any(Sort.class)))
            .thenReturn(Page.empty());

        service.getTraces(userId, "my-project", 0, 10);

        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(traceService).getTracesByProjectId(anyLong(), anyInt(), anyInt(), sortCaptor.capture());

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
