package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    // ── Main cascade delete flow ──────────────────────────────────────────────

    @Test
    void deleteTracesAndRelatedSteps_collectsAllStepIdsAndDeletesThem() {
        UUID traceId1 = UUID.randomUUID();
        UUID traceId2 = UUID.randomUUID();
        UUID stepId1 = UUID.randomUUID();
        UUID stepId2 = UUID.randomUUID();
        UUID stepId3 = UUID.randomUUID();

        when(stepService.findStepIdsByTraceId(traceId1)).thenReturn(List.of(stepId1, stepId2));
        when(stepService.findStepIdsByTraceId(traceId2)).thenReturn(List.of(stepId3));

        List<UUID> traceIds = List.of(traceId1, traceId2);
        List<UUID> result = service.deleteTracesAndRelatedStepsByTraceIds(traceIds);

        var inOrder = inOrder(stepService, traceService);
        inOrder.verify(stepService).deleteStepsByStepUUID(argThat(ids ->
            ids.containsAll(List.of(stepId1, stepId2, stepId3)) && ids.size() == 3
        ));
        inOrder.verify(traceService).deleteTraceByTraceId(traceIds);
        assertEquals(traceIds, result);
    }

    @Test
    void deleteTracesAndRelatedSteps_noStepsForTrace_deletesOnlyTrace() {
        UUID traceId = UUID.randomUUID();
        when(stepService.findStepIdsByTraceId(traceId)).thenReturn(List.of());

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
}
