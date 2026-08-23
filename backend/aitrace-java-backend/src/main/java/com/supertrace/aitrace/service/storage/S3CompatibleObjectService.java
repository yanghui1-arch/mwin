package com.supertrace.aitrace.service.storage;

import com.supertrace.aitrace.service.storage.model.StepPayload;
import com.supertrace.aitrace.service.storage.model.TracePayload;

import java.util.UUID;

public interface S3CompatibleObjectService {
    String storeStepPayload(UUID stepId, StepPayload payload);

    String storeTracePayload(UUID traceId, TracePayload payload);

    StepPayload loadStepPayload(String objectKey);

    TracePayload loadTracePayload(String objectKey);
}
