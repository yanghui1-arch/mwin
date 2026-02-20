package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LogServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectService projectService;

    @Mock
    private StepService stepService;

    @Mock
    private StepMetaService stepMetaService;

    @Mock
    private TraceService traceService;

    @InjectMocks
    private LogServiceImpl service;

    private UUID userId;
    private Project existingProject;

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

    private LogTraceRequest buildTraceRequest(String projectName) {
        LogTraceRequest req = new LogTraceRequest();
        req.setProjectName(projectName);
        req.setTraceId(UUID.randomUUID().toString());
        req.setTraceName("trace1");
        req.setConversationId(UUID.randomUUID().toString());
        req.setTags(List.of());
        req.setStartTime(LocalDateTime.now().minusSeconds(5));
        req.setLastUpdateTimestamp(LocalDateTime.now());
        return req;
    }

    // ── logStep: project exists ───────────────────────────────────────────────

    @Test
    void logStep_projectExists_usesExistingProject() {
        LogStepRequest req = buildStepRequest("test-project");
        UUID expectedStepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project"))
            .thenReturn(List.of(existingProject));
        when(stepService.logStep(userId, req, 10L)).thenReturn(expectedStepId);

        UUID result = service.logStep(userId, req);

        assertEquals(expectedStepId, result);
        // projectService.createNewProjectByProgram must NOT be called
        verify(projectService, never()).createNewProjectByProgram(any(), any());
    }

    @Test
    void logStep_projectExistsForDifferentUser_createsNewProject() {
        // The existing project belongs to a DIFFERENT user
        UUID otherUserId = UUID.randomUUID();
        Project otherUserProject = Project.builder()
            .id(20L).userId(otherUserId).name("test-project")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        Project newProject = Project.builder()
            .id(30L).userId(userId).name("test-project")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogStepRequest req = buildStepRequest("test-project");
        UUID expectedStepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project"))
            .thenReturn(List.of(otherUserProject));
        when(projectService.createNewProjectByProgram("test-project", userId))
            .thenReturn(newProject);
        when(stepService.logStep(userId, req, 30L)).thenReturn(expectedStepId);

        UUID result = service.logStep(userId, req);

        assertEquals(expectedStepId, result);
        verify(projectService).createNewProjectByProgram("test-project", userId);
    }

    @Test
    void logStep_projectNotFound_createsNewProject() {
        Project newProject = Project.builder()
            .id(99L).userId(userId).name("brand-new")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogStepRequest req = buildStepRequest("brand-new");
        UUID expectedStepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("brand-new")).thenReturn(List.of());
        when(projectService.createNewProjectByProgram("brand-new", userId)).thenReturn(newProject);
        when(stepService.logStep(userId, req, 99L)).thenReturn(expectedStepId);

        UUID result = service.logStep(userId, req);

        assertEquals(expectedStepId, result);
        verify(projectService).createNewProjectByProgram("brand-new", userId);
    }

    @Test
    void logStep_alwaysCallsStepMetaService() {
        LogStepRequest req = buildStepRequest("test-project");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project"))
            .thenReturn(List.of(existingProject));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);

        service.logStep(userId, req);

        verify(stepMetaService).addStepMeta(
            eq(stepId),
            any(StepMetadata.class),
            eq(req.getLlmProvider()),
            eq(req.getUsage())
        );
    }

    @Test
    void logStep_returnsStepIdFromStepService() {
        LogStepRequest req = buildStepRequest("test-project");
        UUID stepId = UUID.randomUUID();

        when(projectRepository.findProjectsByName(any())).thenReturn(List.of(existingProject));
        when(stepService.logStep(any(), any(), any())).thenReturn(stepId);

        UUID result = service.logStep(userId, req);

        assertEquals(stepId, result);
    }

    // ── logTrace ──────────────────────────────────────────────────────────────

    @Test
    void logTrace_projectExists_createsTrace() {
        LogTraceRequest req = buildTraceRequest("test-project");
        UUID traceId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("test-project"))
            .thenReturn(List.of(existingProject));
        when(traceService.createTrace(req, 10L)).thenReturn(traceId);

        UUID result = service.logTrace(userId, req);

        assertEquals(traceId, result);
    }

    @Test
    void logTrace_projectNotFound_createsProjectThenTrace() {
        Project newProject = Project.builder()
            .id(55L).userId(userId).name("new-trace-project")
            .cost(BigDecimal.ZERO).averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now()).build();

        LogTraceRequest req = buildTraceRequest("new-trace-project");
        UUID traceId = UUID.randomUUID();

        when(projectRepository.findProjectsByName("new-trace-project")).thenReturn(List.of());
        when(projectService.createNewProjectByProgram("new-trace-project", userId)).thenReturn(newProject);
        when(traceService.createTrace(req, 55L)).thenReturn(traceId);

        UUID result = service.logTrace(userId, req);

        assertEquals(traceId, result);
        verify(projectService).createNewProjectByProgram("new-trace-project", userId);
    }
}
