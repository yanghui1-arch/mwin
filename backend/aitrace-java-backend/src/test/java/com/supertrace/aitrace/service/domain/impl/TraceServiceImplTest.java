package com.supertrace.aitrace.service.domain.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.factory.TraceFactory;
import com.supertrace.aitrace.repository.TraceRepository;
import com.supertrace.aitrace.service.storage.PayloadFormat;
import com.supertrace.aitrace.service.storage.S3CompatibleObjectService;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import com.supertrace.aitrace.service.storage.model.TracePayload;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TraceServiceImplTest {
    @Mock private TraceRepository traceRepository;
    @Mock private TraceFactory traceFactory;
    @Mock private S3CompatibleObjectService s3CompatibleObjectService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks private TraceServiceImpl service;

    @Test
    void createTrace_storesPayloadAndPersistsCompletedSnapshot() {
        UUID traceId = UUID.randomUUID();
        LogTraceRequest request = new LogTraceRequest();
        request.setTraceId(traceId.toString());
        request.setInput(Map.of("prompt", "hello"));
        request.setOutput(Map.of("answer", "world"));
        TracePayload payload = new TracePayload(
            objectMapper.valueToTree(request.getInput()),
            objectMapper.valueToTree(request.getOutput())
        );
        String objectKey = objectKey(traceId);
        Trace trace = Trace.builder().id(traceId).payloadObjectKey(objectKey).build();
        when(s3CompatibleObjectService.storeTracePayload(traceId, payload)).thenReturn(objectKey);
        when(traceFactory.createTrace(request, 1L, objectKey)).thenReturn(trace);

        assertEquals(traceId, service.createTrace(request, 1L));

        verify(s3CompatibleObjectService).storeTracePayload(traceId, payload);
        verify(traceRepository).save(trace);
    }

    @Test
    void createTrace_objectStorageFailure_doesNotPersistTrace() {
        UUID traceId = UUID.randomUUID();
        LogTraceRequest request = new LogTraceRequest();
        request.setTraceId(traceId.toString());
        request.setInput(Map.of("prompt", "hello"));
        request.setOutput(Map.of("answer", "world"));
        TracePayload payload = new TracePayload(
            objectMapper.valueToTree(request.getInput()),
            objectMapper.valueToTree(request.getOutput())
        );
        when(s3CompatibleObjectService.storeTracePayload(traceId, payload))
            .thenThrow(new IllegalStateException("OSS unavailable"));

        assertThrows(IllegalStateException.class, () -> service.createTrace(request, 1L));

        verifyNoInteractions(traceRepository);
    }

    @Test
    void getOwnedTracePayload_loadsAndConvertsTypedPayload() {
        UUID userId = UUID.randomUUID();
        UUID traceId = UUID.randomUUID();
        String objectKey = objectKey(traceId);
        Trace trace = Trace.builder().id(traceId).payloadObjectKey(objectKey).build();
        TracePayload payload = new TracePayload(
            objectMapper.valueToTree(Map.of("prompt", "hello")),
            objectMapper.valueToTree(Map.of("answer", "world"))
        );
        when(traceRepository.findByIdForUser(traceId, userId)).thenReturn(Optional.of(trace));
        when(s3CompatibleObjectService.loadTracePayload(objectKey)).thenReturn(payload);

        StoredPayload result = service.getOwnedTracePayload(userId, traceId);

        assertEquals(payload.toStoredPayload(), result);
    }

    @Test
    void getOwnedTracePayload_missingOrNotOwned_doesNotReadObjectStorage() {
        UUID userId = UUID.randomUUID();
        UUID traceId = UUID.randomUUID();
        when(traceRepository.findByIdForUser(traceId, userId)).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(
            RuntimeException.class,
            () -> service.getOwnedTracePayload(userId, traceId)
        );

        assertEquals("Trace not found", error.getMessage());
        verifyNoInteractions(s3CompatibleObjectService);
    }

    private static String objectKey(UUID traceId) {
        return PayloadFormat.traceObjectKey(traceId);
    }
}
