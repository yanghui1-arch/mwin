package com.supertrace.aitrace.service.storage.model;

import com.fasterxml.jackson.databind.JsonNode;

/** API response containing the lazily loaded input and output. */
public record StoredPayload(JsonNode input, JsonNode output) {
}
