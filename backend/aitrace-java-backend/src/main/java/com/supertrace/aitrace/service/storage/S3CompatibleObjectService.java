package com.supertrace.aitrace.service.storage;

import com.supertrace.aitrace.service.storage.model.StepPayload;
import com.supertrace.aitrace.service.storage.model.StepPayloadChunkEntry;
import com.supertrace.aitrace.service.storage.model.TracePayload;

import java.util.List;
import java.util.UUID;

public interface S3CompatibleObjectService {
    String storeStepPayload(UUID stepId, StepPayload payload);

    /** Stores one ordered TraceTree Step chunk and returns its object key. */
    String storeStepPayloadChunk(List<StepPayloadChunkEntry> entries);

    String storeTracePayload(UUID traceId, TracePayload payload);

    /** Loads a Step from either a v2 single payload or a v3 chunk. */
    StepPayload loadStepPayload(String objectKey, UUID stepId);

    TracePayload loadTracePayload(String objectKey);
}
