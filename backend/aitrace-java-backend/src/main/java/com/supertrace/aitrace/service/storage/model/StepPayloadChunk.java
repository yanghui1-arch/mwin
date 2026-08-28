package com.supertrace.aitrace.service.storage.model;

import java.util.List;

/** Up to sixteen Step payloads stored in one TraceTree OSS object. */
public record StepPayloadChunk(List<StepPayloadChunkEntry> steps) {
}
