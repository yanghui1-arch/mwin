package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeleteServiceImplTest {

    @Mock
    private StepService stepService;

    @Mock
    private TraceService traceService;

    @InjectMocks
    private DeleteServiceImpl service;

    private Step buildStep(UUID stepId, UUID traceId) {
        return Step.builder()
            .id(stepId)
            .name("s")
            .traceId(traceId)
            .type("llm_response")
            .tags(new ArrayList<>())
            .input(new HashMap<>())
            .output(StepOutput.builder().build())
            .projectName("p")
            .projectId(1L)
            .startTime(LocalDateTime.now())
            .build();
    }

    // ── Main cascade delete flow ──────────────────────────────────────────────

    @Test
    void deleteTracesAndRelatedSteps_collectsAllStepIdsAndDeletesThem() {
        UUID traceId1 = UUID.randomUUID();
        UUID traceId2 = UUID.randomUUID();
        UUID stepId1 = UUID.randomUUID();
        UUID stepId2 = UUID.randomUUID();
        UUID stepId3 = UUID.randomUUID();

        when(stepService.findStepsByTraceId(traceId1))
            .thenReturn(List.of(buildStep(stepId1, traceId1), buildStep(stepId2, traceId1)));
        when(stepService.findStepsByTraceId(traceId2))
            .thenReturn(List.of(buildStep(stepId3, traceId2)));

        List<UUID> traceIds = List.of(traceId1, traceId2);
        service.deleteTracesAndRelatedStepsByTraceIds(traceIds);

        // Steps must be deleted before traces
        verify(stepService).deleteStepsByStepUUID(argThat(ids ->
            ids.containsAll(List.of(stepId1, stepId2, stepId3)) && ids.size() == 3
        ));
        verify(traceService).deleteTraceByTraceId(traceIds);
    }

    @Test
    void deleteTracesAndRelatedSteps_stepsDeletedBeforeTraces() {
        UUID traceId = UUID.randomUUID();
        UUID stepId = UUID.randomUUID();

        when(stepService.findStepsByTraceId(traceId)).thenReturn(List.of(buildStep(stepId, traceId)));

        service.deleteTracesAndRelatedStepsByTraceIds(List.of(traceId));

        // Verify ordering via InOrder
        var inOrder = inOrder(stepService, traceService);
        inOrder.verify(stepService).deleteStepsByStepUUID(anyList());
        inOrder.verify(traceService).deleteTraceByTraceId(anyList());
    }

    @Test
    void deleteTracesAndRelatedSteps_noStepsForTrace_deletesOnlyTrace() {
        UUID traceId = UUID.randomUUID();
        when(stepService.findStepsByTraceId(traceId)).thenReturn(List.of());

        service.deleteTracesAndRelatedStepsByTraceIds(List.of(traceId));

        verify(stepService).deleteStepsByStepUUID(List.of());
        verify(traceService).deleteTraceByTraceId(List.of(traceId));
    }

    @Test
    void deleteTracesAndRelatedSteps_emptyInput_noDeletionCalls() {
        service.deleteTracesAndRelatedStepsByTraceIds(List.of());

        verify(stepService).deleteStepsByStepUUID(List.of());
        verify(traceService).deleteTraceByTraceId(List.of());
    }

    @Test
    void deleteTracesAndRelatedSteps_returnsInputTraceIds() {
        UUID t1 = UUID.randomUUID();
        UUID t2 = UUID.randomUUID();
        when(stepService.findStepsByTraceId(any())).thenReturn(List.of());

        List<UUID> result = service.deleteTracesAndRelatedStepsByTraceIds(List.of(t1, t2));

        assertEquals(List.of(t1, t2), result);
    }
}
