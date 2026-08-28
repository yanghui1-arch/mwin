package com.supertrace.aitrace.service.domain.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.factory.StepFactory;
import com.supertrace.aitrace.repository.StepRepository;
import com.supertrace.aitrace.service.domain.model.StepBatchItem;
import com.supertrace.aitrace.service.storage.PayloadFormat;
import com.supertrace.aitrace.service.storage.S3CompatibleObjectService;
import com.supertrace.aitrace.service.storage.model.StepPayload;
import com.supertrace.aitrace.service.storage.model.StepPayloadChunkEntry;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StepServiceImplTest {

    @Mock
    private StepRepository stepRepository;

    @Mock
    private StepFactory stepFactory;

    @Mock
    private S3CompatibleObjectService s3CompatibleObjectService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

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
        return Step.builder()
            .id(id)
            .name("existing-step")
            .traceId(UUID.randomUUID())
            .type("llm_response")
            .tags(new ArrayList<>(List.of("old-tag")))
            .payloadObjectKey(payloadObjectKey(id))
            .model("gpt-3.5-turbo")
            .usage(new LLMUsage(5, 5, 10, null, null))
            .projectName("test-project")
            .projectId(projectId)
            .startTime(LocalDateTime.now().minusSeconds(10))
            .build();
    }

    private String payloadObjectKey(UUID stepId) {
        return PayloadFormat.stepObjectKey(stepId);
    }

    private StepPayload payload(LogStepRequest request) {
        return new StepPayload(
            objectMapper.valueToTree(request.getInput()),
            objectMapper.valueToTree(request.getOutput())
        );
    }

    // ── logStep ──────────────────────────────────────────────────────────────

    @Test
    void logStep_storesPayloadAndPersistsCompletedSnapshot() {
        LogStepRequest req = buildRequest();
        UUID stepId = UUID.fromString(req.getStepId());
        Step newStep = buildStep(stepId);

        String payloadObjectKey = payloadObjectKey(stepId);
        when(s3CompatibleObjectService.storeStepPayload(stepId, payload(req))).thenReturn(payloadObjectKey);
        when(stepFactory.createStep(req, projectId, payloadObjectKey)).thenReturn(newStep);
        when(stepRepository.saveAndFlush(any())).thenReturn(newStep);

        UUID result = service.logStep(userId, req, projectId);

        assertEquals(stepId, result);
        verify(stepFactory).createStep(req, projectId, payloadObjectKey);
        verify(stepRepository).saveAndFlush(newStep);
    }

    @Test
    void logStep_invalidStepIdFormat_throwsException() {
        LogStepRequest req = buildRequest();
        req.setStepId("not-a-uuid");

        assertThrows(IllegalArgumentException.class,
            () -> service.logStep(userId, req, projectId));

        verifyNoInteractions(s3CompatibleObjectService, stepRepository);
    }

    @Test
    void logStep_objectStorageFailure_doesNotPersistStep() {
        LogStepRequest req = buildRequest();
        UUID stepId = UUID.fromString(req.getStepId());
        when(s3CompatibleObjectService.storeStepPayload(stepId, payload(req)))
            .thenThrow(new IllegalStateException("OSS unavailable"));

        assertThrows(
            IllegalStateException.class,
            () -> service.logStep(userId, req, projectId)
        );

        verifyNoInteractions(stepRepository);
    }

    @Test
    void logSteps_storesSixteenPayloadsPerChunk() {
        List<LogStepRequest> requests = new ArrayList<>();
        for (int index = 0; index < 17; index++) {
            requests.add(buildRequest());
        }
        List<StepBatchItem> items = requests.stream()
            .map(request -> new StepBatchItem(request, projectId))
            .toList();
        when(s3CompatibleObjectService.storeStepPayloadChunk(any()))
            .thenReturn("payloads/v3/step-chunk/first.json.gz")
            .thenReturn("payloads/v3/step-chunk/last.json.gz");
        when(stepFactory.createStep(any(), eq(projectId), anyString()))
            .thenAnswer(invocation -> {
                LogStepRequest request = invocation.getArgument(0);
                return buildStep(UUID.fromString(request.getStepId()));
            });

        service.logSteps(userId, items);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<StepPayloadChunkEntry>> chunkCaptor = ArgumentCaptor.forClass(List.class);
        verify(s3CompatibleObjectService, times(2)).storeStepPayloadChunk(chunkCaptor.capture());
        assertEquals(16, chunkCaptor.getAllValues().get(0).size());
        assertEquals(1, chunkCaptor.getAllValues().get(1).size());
        assertEquals(UUID.fromString(requests.get(0).getStepId()), chunkCaptor.getAllValues().get(0).get(0).id());
        assertEquals(UUID.fromString(requests.get(16).getStepId()), chunkCaptor.getAllValues().get(1).get(0).id());
        verify(stepRepository).saveAllAndFlush(argThat(steps ->
            StreamSupport.stream(steps.spliterator(), false).count() == 17
        ));
    }

    @Test
    void logSteps_objectStorageFailure_doesNotPersistSteps() {
        LogStepRequest request = buildRequest();
        List<StepBatchItem> items = List.of(new StepBatchItem(request, projectId));
        when(s3CompatibleObjectService.storeStepPayloadChunk(any()))
            .thenThrow(new IllegalStateException("OSS unavailable"));

        assertThrows(IllegalStateException.class, () -> service.logSteps(userId, items));

        verifyNoInteractions(stepRepository);
    }

    // ── getOwnedStepPayload ──────────────────────────────────────────────────

    @Test
    void getOwnedStepPayload_objectStored_loadsFromObjectStorage() {
        UUID stepId = UUID.randomUUID();
        Step step = buildStep(stepId);
        String objectKey = payloadObjectKey(stepId);
        step.setPayloadObjectKey(objectKey);
        StepPayload expected = new StepPayload(
            objectMapper.valueToTree(Map.of("prompt", "hello")),
            objectMapper.valueToTree(Map.of("answer", "world"))
        );
        when(stepRepository.findByIdForUser(stepId, userId)).thenReturn(Optional.of(step));
        when(s3CompatibleObjectService.loadStepPayload(objectKey, stepId)).thenReturn(expected);

        StoredPayload result = service.getOwnedStepPayload(userId, stepId);

        assertEquals(expected.toStoredPayload(), result);
        verify(s3CompatibleObjectService).loadStepPayload(objectKey, stepId);
    }

    @Test
    void getOwnedStepPayload_missingOrNotOwned_throws() {
        UUID stepId = UUID.randomUUID();
        when(stepRepository.findByIdForUser(stepId, userId)).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(
            RuntimeException.class,
            () -> service.getOwnedStepPayload(userId, stepId)
        );

        assertEquals("Step not found", error.getMessage());
        verifyNoInteractions(s3CompatibleObjectService);
    }

}
