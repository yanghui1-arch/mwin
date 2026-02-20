package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.factory.StepFactory;
import com.supertrace.aitrace.repository.StepRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StepServiceImplTest {

    @Mock
    private StepRepository stepRepository;

    @Mock
    private StepFactory stepFactory;

    @InjectMocks
    private StepServiceImpl service;

    private UUID userId;
    private Long projectId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        projectId = 1L;
    }

    private LogStepRequest buildRequest() {
        LogStepRequest req = new LogStepRequest();
        req.setProjectName("test-project");
        req.setStepName("my-step");
        req.setStepId(UUID.randomUUID().toString());
        req.setTraceId(UUID.randomUUID().toString());
        req.setStepType("llm_response");
        req.setTags(List.of("tag1"));
        req.setInput(new HashMap<>());
        req.setOutput(StepOutput.builder().build());
        req.setModel("gpt-4o");
        req.setUsage(new LLMUsage(10, 5, 15, null, null));
        req.setStartTime(LocalDateTime.now().minusSeconds(2));
        req.setEndTime(LocalDateTime.now());
        return req;
    }

    private Step buildStep(UUID id) {
        Map<String, Object> input = new HashMap<>();
        input.put("func_inputs", "x");
        input.put("llm_inputs", "y");
        return Step.builder()
            .id(id)
            .name("existing-step")
            .traceId(UUID.randomUUID())
            .type("llm_response")
            .tags(new ArrayList<>(List.of("old-tag")))
            .input(input)
            .output(StepOutput.builder().funcOutput("old_out").build())
            .model("gpt-3.5-turbo")
            .usage(new LLMUsage(5, 5, 10, null, null))
            .projectName("test-project")
            .projectId(projectId)
            .startTime(LocalDateTime.now().minusSeconds(10))
            .build();
    }

    // ── logStep: new step path ────────────────────────────────────────────────

    @Test
    void logStep_stepNotInDb_createsViaFactory() {
        LogStepRequest req = buildRequest();
        UUID stepId = UUID.fromString(req.getStepId());
        Step newStep = buildStep(stepId);

        when(stepRepository.findById(stepId)).thenReturn(Optional.empty());
        when(stepFactory.createStep(req, projectId)).thenReturn(newStep);
        when(stepRepository.saveAndFlush(any())).thenReturn(newStep);

        UUID result = service.logStep(userId, req, projectId);

        assertEquals(stepId, result);
        verify(stepFactory).createStep(req, projectId);
        verify(stepRepository).saveAndFlush(newStep);
    }

    // ── logStep: enrich existing step path ───────────────────────────────────

    @Test
    void logStep_stepExistsInDb_enrichesExistingStep() {
        LogStepRequest req = buildRequest();
        UUID stepId = UUID.fromString(req.getStepId());
        Step existing = buildStep(stepId);

        when(stepRepository.findById(stepId)).thenReturn(Optional.of(existing));
        when(stepRepository.saveAndFlush(any())).thenReturn(existing);

        UUID result = service.logStep(userId, req, projectId);

        assertEquals(stepId, result);
        // Factory must NOT be called when step already exists
        verify(stepFactory, never()).createStep(any(), any());
        // The saved step must be the enriched existing one
        verify(stepRepository).saveAndFlush(existing);
    }

    @Test
    void logStep_stepExistsInDb_tagsAreMerged() {
        LogStepRequest req = buildRequest();
        req.setTags(List.of("new-tag"));
        UUID stepId = UUID.fromString(req.getStepId());
        Step existing = buildStep(stepId);
        // existing has ["old-tag"]

        when(stepRepository.findById(stepId)).thenReturn(Optional.of(existing));
        when(stepRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        service.logStep(userId, req, projectId);

        assertTrue(existing.getTags().contains("new-tag"));
        assertTrue(existing.getTags().contains("old-tag"));
    }

    @Test
    void logStep_invalidStepIdFormat_throwsException() {
        LogStepRequest req = buildRequest();
        req.setStepId("not-a-uuid");

        assertThrows(IllegalArgumentException.class,
            () -> service.logStep(userId, req, projectId));
    }

    // ── findStepsByProjectId ──────────────────────────────────────────────────

    @Test
    void findStepsByProjectId_withoutSort_returnsPage() {
        Step s = buildStep(UUID.randomUUID());
        Page<Step> expected = new PageImpl<>(List.of(s));
        when(stepRepository.findStepsByProjectId(eq(projectId), any(Pageable.class))).thenReturn(expected);

        Page<Step> result = service.findStepsByProjectId(projectId, 0, 10);

        assertEquals(1, result.getTotalElements());
        verify(stepRepository).findStepsByProjectId(eq(projectId), any(Pageable.class));
    }

    @Test
    void findStepsByProjectId_withSort_returnsPage() {
        Step s = buildStep(UUID.randomUUID());
        Page<Step> expected = new PageImpl<>(List.of(s));
        Sort sort = Sort.by(Sort.Direction.DESC, "startTime");
        when(stepRepository.findStepsByProjectId(eq(projectId), any(Pageable.class))).thenReturn(expected);

        Page<Step> result = service.findStepsByProjectId(projectId, 0, 10, sort);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void findStepsByProjectId_noResults_returnsEmptyPage() {
        Page<Step> empty = new PageImpl<>(List.of());
        when(stepRepository.findStepsByProjectId(eq(projectId), any(Pageable.class))).thenReturn(empty);

        Page<Step> result = service.findStepsByProjectId(projectId, 0, 10);

        assertEquals(0, result.getTotalElements());
    }

    // ── findStepsByTraceId ────────────────────────────────────────────────────

    @Test
    void findStepsByTraceId_delegatesToRepository() {
        UUID traceId = UUID.randomUUID();
        Step s = buildStep(UUID.randomUUID());
        when(stepRepository.findStepsByTraceId(traceId)).thenReturn(List.of(s));

        List<Step> result = service.findStepsByTraceId(traceId);

        assertEquals(1, result.size());
        verify(stepRepository).findStepsByTraceId(traceId);
    }

    @Test
    void findStepsByTraceId_emptyResult_returnsEmptyList() {
        UUID traceId = UUID.randomUUID();
        when(stepRepository.findStepsByTraceId(traceId)).thenReturn(List.of());

        List<Step> result = service.findStepsByTraceId(traceId);

        assertTrue(result.isEmpty());
    }

    // ── deleteStepsByStepUUID ─────────────────────────────────────────────────

    @Test
    void deleteStepsByStepUUID_callsDeleteAllByIdAndReturnsIds() {
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID());

        List<UUID> result = service.deleteStepsByStepUUID(ids);

        verify(stepRepository).deleteAllById(ids);
        assertEquals(ids, result, "Must return the same list of IDs that were requested for deletion");
    }

    @Test
    void deleteStepsByStepUUID_emptyList_doesNotThrow() {
        assertDoesNotThrow(() -> service.deleteStepsByStepUUID(List.of()));
        verify(stepRepository).deleteAllById(List.of());
    }
}
