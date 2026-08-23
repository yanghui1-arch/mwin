package com.supertrace.aitrace.service.storage.model;

import com.fasterxml.jackson.databind.JsonNode;

/** JSON payload stored for a Step. */
public record StepPayload(JsonNode input, JsonNode output) {
    public StoredPayload toStoredPayload() {
        return new StoredPayload(input, output);
    }
}
