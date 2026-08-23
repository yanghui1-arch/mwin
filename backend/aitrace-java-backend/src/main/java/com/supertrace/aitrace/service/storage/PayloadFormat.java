package com.supertrace.aitrace.service.storage;

import java.util.UUID;

/** Defines the versioned JSON schemas and object keys used by payload storage. */
public final class PayloadFormat {
    public static final int CURRENT_VERSION = 2;
    public static final String STEP_SCHEMA = "mwin.step-payload/v" + CURRENT_VERSION;
    public static final String TRACE_SCHEMA = "mwin.trace-payload/v" + CURRENT_VERSION;

    private PayloadFormat() {
    }

    public static String stepObjectKey(UUID stepId) {
        return objectKey("step", stepId);
    }

    public static String traceObjectKey(UUID traceId) {
        return objectKey("trace", traceId);
    }

    private static String objectKey(String payloadType, UUID id) {
        return "payloads/v" + CURRENT_VERSION + "/" + payloadType + "/" + id + ".json.gz";
    }
}
