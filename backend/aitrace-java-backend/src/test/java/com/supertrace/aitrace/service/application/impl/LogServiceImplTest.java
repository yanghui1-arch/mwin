package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.service.domain.ProjectService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LogServiceImplTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectService    projectService;
    @Mock private StepService       stepService;
    @Mock private StepMetaService   stepMetaService;
    @Mock private TraceService      traceService;

    @InjectMocks
    private LogServiceImpl service;

    private UUID    userId;
    private Project existingProject;

    // Fixed timestamps for deterministic duration calculations
    private static final LocalDateTime T_START = LocalDateTime.of(2026, 1, 1, 0, 0, 0);
    private static final LocalDateTime T_3S    = LocalDateTime.of(2026, 1, 1, 0, 0, 3); // 3 000 ms
    private static final LocalDateTime T_5S    = LocalDateTime.of(2026, 1, 1, 0, 0, 5); // 5 000 ms
    private static final LocalDateTime T_7S    = LocalDateTime.of(2026, 1, 1, 0, 0, 7); // 7 000 ms

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        existingProject = Project.builder()
            .id(10L)
            .userId(userId)
            .name("test-project")
            .cost(BigDecimal.ZERO)
            .averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LogStepRequest buildStepRequest(String projectName) {
        LogStepRequest req = new LogStepRequest();
        req.setProjectName(projectName);
        req.setStepName("step1");
        req.setStepId(UUID.randomUUID().toString());
        req.setTraceId(UUID.randomUUID().toString());
        req.setStepType("llm_response");
        req.setTags(List.of());
        req.setStartTime(LocalDateTime.now());
        req.setDescription("desc");
        req.setLlmProvider("OPENAI");
        req.setUsage(new LLMUsage(10, 5, 15, null, null));
        return req;
    }

    private LogTraceRequest buildTraceRequest(String projectName, LocalDateTime start, LocalDateTime end) {
        LogTraceRequest req = new LogTraceRequest();
        req.setProjectName(projectName);
        req.setTraceId(UUID.randomUUID().toString());
        req.setTraceName("trace1");
        req.setConversationId(UUID.randomUUID().toString());
        req.setTags(List.of());
        req.setStartTime(start);
        req.setLastUpdateTimestamp(end);
        return req;
    }

    /** Stub logStep dependencies with zero-cost default — for tests that only care about project resolution. */
    private void stubLogStepZeroCost(UUID stepId) {
        when(stepMetaService.findCostsByStepIds(any())).thenReturn(Map.of());
        when(stepMetaService.addStepMeta(any(), any(), any(), any(), any()))
            .thenReturn(StepMeta.builder().id(stepId).cost(BigDecimal.ZERO).build());
    }

    /** Stub logTrace dependencies with empty existing trace and count=1 — for tests that only care about project resolution. */
    private void stubLogTraceDefaults(UUID traceId) {
        when(traceService.findById(traceId)).thenReturn(Optional.empty());
        when(traceService.countByProjectId(anyLong())).thenReturn(1L);
    }

    private Trace buildTrace(UUID traceId, LocalDateTime start, LocalDateTime end) {
        return Trace.builder()
            .id(traceId)
            .projectId(10L)
            .projectName("test-project")
            .name("trace1")
            .conversationId(UUID.randomUUID())
            .tags(List.of())
            .startTime(start)
            .lastUpdateTimestamp(end)
            .build();
    }

    // ── logStep: project resolution ───────────────────────────────────────────

    @Test
    void logStep_projectExists_usesExistingProject() {
        LogStepRequest req = buildStepRequest("test-project");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(existingProject));
        when(stepService.logStep(userId, req, 10L)).thenReturn(stepId);
        stubLogStepZeroCost(stepId);

        service.logStep(userId, req);

        verify(projectService, never()).createNewProjectByProgram(any(), any());
    }

    @Test
    void logStep_projectExistsForDifferentUser_createsNewProject() {
        UUID otherUserId = UUID.randomUUID();
        Project otherProject = Project.builder()
            .id(20L).userId(otherUserId).name("test-project")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();
        Project newProject = Project.builder()
            .id(30L).userId(userId).name("test-project")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogStepRequest req = buildStepRequest("test-project");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(otherProject));
        when(projectService.createNewProjectByProgram("test-project", userId)).thenReturn(newProject);
        when(stepService.logStep(userId, req, 30L)).thenReturn(stepId);
        stubLogStepZeroCost(stepId);

        service.logStep(userId, req);

        verify(projectService).createNewProjectByProgram("test-project", userId);
    }

    @Test
    void logStep_projectNotFound_createsNewProject() {
        Project newProject = Project.builder()
            .id(99L).userId(userId).name("brand-new")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogStepRequest req = buildStepRequest("brand-new");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("brand-new")).thenReturn(List.of());
        when(projectService.createNewProjectByProgram("brand-new", userId)).thenReturn(newProject);
        when(stepService.logStep(userId, req, 99L)).thenReturn(stepId);
        stubLogStepZeroCost(stepId);

        service.logStep(userId, req);

        verify(projectService).createNewProjectByProgram("brand-new", userId);
    }

    @Test
    void logStep_returnsStepIdFromStepService() {
        LogStepRequest req = buildStepRequest("test-project");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName(any())).thenReturn(List.of(existingProject));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);
        stubLogStepZeroCost(stepId);

        assertEquals(stepId, service.logStep(userId, req));
    }

    @Test
    void logStep_alwaysCallsStepMetaService() {
        LogStepRequest req = buildStepRequest("test-project");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(existingProject));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);
        stubLogStepZeroCost(stepId);

        service.logStep(userId, req);

        verify(stepMetaService).addStepMeta(
            eq(stepId), eq(req.getDescription()),
            eq(req.getLlmProvider()), eq(req.getModel()), eq(req.getUsage())
        );
    }

    // ── logStep: cost delta (the key correctness tests) ───────────────────────

    @Test
    void logStep_firstCall_addsFullStepCostToProject() {
        // First call: no existing step cost → delta = updatedCost - 0 = full cost
        BigDecimal stepCost = new BigDecimal("0.005");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(existingProject));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);
        when(stepMetaService.findCostsByStepIds(any())).thenReturn(Map.of()); // no prior cost
        when(stepMetaService.addStepMeta(any(), any(), any(), any(), any()))
            .thenReturn(StepMeta.builder().id(stepId).cost(stepCost).build());

        service.logStep(userId, buildStepRequest("test-project"));

        // project cost: 0 + (0.005 - 0) = 0.005
        verify(projectRepository).updateCost(10L, new BigDecimal("0.005"));
    }

    @Test
    void logStep_secondCall_noUsage_projectCostUnchanged() {
        // Second call carries no usage: addStepMeta keeps the existing cost.
        // delta = existingCost - existingCost = 0 → project cost must NOT grow.
        BigDecimal existingStepCost = new BigDecimal("0.005");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(existingProject));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);
        when(stepMetaService.findCostsByStepIds(any())).thenReturn(Map.of(stepId, existingStepCost));
        when(stepMetaService.addStepMeta(any(), any(), any(), any(), any()))
            .thenReturn(StepMeta.builder().id(stepId).cost(existingStepCost).build()); // cost unchanged

        service.logStep(userId, buildStepRequest("test-project"));

        // delta = 0.005 - 0.005 = 0.000 (scale 3) — BigDecimal.equals() compares scale too,
        // so BigDecimal.ZERO (scale 0) ≠ 0.000 (scale 3). Use compareTo for value-only check.
        verify(projectRepository).updateCost(eq(10L), argThat(v -> v.compareTo(BigDecimal.ZERO) == 0));
    }

    @Test
    void logStep_secondCall_withNewCost_addsOnlyDeltaToProject() {
        // Second call with a different cost: only the delta is applied.
        // Prevents double-counting the step's previous cost.
        BigDecimal prevStepCost    = new BigDecimal("0.005");
        BigDecimal updatedStepCost = new BigDecimal("0.008");
        UUID stepId = UUID.randomUUID();

        Project projectWithCost = Project.builder()
            .id(10L).userId(userId).name("test-project")
            .cost(new BigDecimal("0.010")).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(projectWithCost));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);
        when(stepMetaService.findCostsByStepIds(any())).thenReturn(Map.of(stepId, prevStepCost));
        when(stepMetaService.addStepMeta(any(), any(), any(), any(), any()))
            .thenReturn(StepMeta.builder().id(stepId).cost(updatedStepCost).build());

        service.logStep(userId, buildStepRequest("test-project"));

        // delta = 0.008 - 0.005 = 0.003 → new project cost = 0.010 + 0.003 = 0.013
        verify(projectRepository).updateCost(10L, new BigDecimal("0.013"));
    }

    // ── logTrace: project resolution ──────────────────────────────────────────

    @Test
    void logTrace_projectExists_createsTrace() {
        LogTraceRequest req = buildTraceRequest("test-project", T_START, T_5S);
        UUID traceId = UUID.fromString(req.getTraceId());

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(existingProject));
        stubLogTraceDefaults(traceId);

        UUID result = service.logTrace(userId, req);

        assertEquals(traceId, result);
        verify(traceService).createTrace(req, 10L);
    }

    @Test
    void logTrace_projectNotFound_createsProjectThenTrace() {
        Project newProject = Project.builder()
            .id(55L).userId(userId).name("new-project")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogTraceRequest req = buildTraceRequest("new-project", T_START, T_5S);
        UUID traceId = UUID.fromString(req.getTraceId());

        when(projectRepository.findProjectsByName("new-project")).thenReturn(List.of());
        when(projectService.createNewProjectByProgram("new-project", userId)).thenReturn(newProject);
        when(traceService.findById(traceId)).thenReturn(Optional.empty());
        when(traceService.countByProjectId(55L)).thenReturn(1L);

        service.logTrace(userId, req);

        verify(projectService).createNewProjectByProgram("new-project", userId);
        verify(traceService).createTrace(req, 55L);
    }

    // ── logTrace: averageDuration incremental update (the key correctness tests)

    @Test
    void logTrace_firstTrace_setsAvgToTraceDuration() {
        // New trace, project had no traces before (oldAvg = 0, count = 1 after insert).
        // newAvg = 0 + (5000 - 0) / 1 = 5000
        LogTraceRequest req = buildTraceRequest("test-project", T_START, T_5S);
        UUID traceId = UUID.fromString(req.getTraceId());

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(existingProject));
        when(traceService.findById(traceId)).thenReturn(Optional.empty());
        when(traceService.countByProjectId(10L)).thenReturn(1L);

        service.logTrace(userId, req);

        verify(projectRepository).updateAverageDuration(10L, 5000);
    }

    @Test
    void logTrace_secondNewTrace_updatesAvgIncrementally() {
        // A second distinct trace arrives. Project already averages 5000 ms over 1 trace.
        // newAvg = 5000 + (7000 - 5000) / 2 = 6000
        Project projectWithAvg = Project.builder()
            .id(10L).userId(userId).name("test-project")
            .cost(BigDecimal.ZERO).averageDuration(5000)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogTraceRequest req = buildTraceRequest("test-project", T_START, T_7S);
        UUID traceId = UUID.fromString(req.getTraceId());

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(projectWithAvg));
        when(traceService.findById(traceId)).thenReturn(Optional.empty()); // brand-new trace
        when(traceService.countByProjectId(10L)).thenReturn(2L);           // 2 after insert

        service.logTrace(userId, req);

        verify(projectRepository).updateAverageDuration(10L, 6000);
    }

    @Test
    void logTrace_sameTrace_secondCall_correctsAvgByDelta() {
        // log_trace is called again for the SAME trace after another step finishes.
        // The trace duration grew from 3000 ms to 5000 ms.
        // Since the trace was already counted (count stays 1), only the delta is applied:
        // newAvg = 3000 + (5000 - 3000) / 1 = 5000
        Project projectWithAvg = Project.builder()
            .id(10L).userId(userId).name("test-project")
            .cost(BigDecimal.ZERO).averageDuration(3000)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogTraceRequest req = buildTraceRequest("test-project", T_START, T_5S);
        UUID traceId = UUID.fromString(req.getTraceId());

        Trace existingTrace = buildTrace(traceId, T_START, T_3S); // old duration = 3000 ms

        when(projectRepository.findProjectsByName("test-project")).thenReturn(List.of(projectWithAvg));
        when(traceService.findById(traceId)).thenReturn(Optional.of(existingTrace));
        when(traceService.countByProjectId(10L)).thenReturn(1L); // count unchanged

        service.logTrace(userId, req);

        verify(projectRepository).updateAverageDuration(10L, 5000);
    }
}
