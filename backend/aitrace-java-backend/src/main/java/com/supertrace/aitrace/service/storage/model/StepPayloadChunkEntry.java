package com.supertrace.aitrace.service.storage.model;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

/** One Step payload stored inside a TraceTree payload chunk. */
public record StepPayloadChunkEntry(UUID id, JsonNode input, JsonNode output) {
    public StepPayload toStepPayload() {
        return new StepPayload(input, output);
    }
}
