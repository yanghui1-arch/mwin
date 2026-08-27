package com.supertrace.aitrace.service.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.supertrace.aitrace.service.storage.model.StepPayload;
import com.supertrace.aitrace.service.storage.model.StepPayloadChunk;
import com.supertrace.aitrace.service.storage.model.TracePayload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Serializes Step and Trace payloads as versioned JSON and compresses them with gzip for object storage.
 * Decoding verifies the schema version, JSON schema, SHA-256 checksum, and decompressed size before
 * returning a typed payload.
 */
@Component
public class PayloadCodec {
    private final ObjectMapper objectMapper;
    private final long maxRawSizeBytes;

    public PayloadCodec(
        ObjectMapper objectMapper,
        @Value("${mwin.oss.max-raw-size-bytes}") long maxRawSizeBytes
    ) {
        this.objectMapper = objectMapper;
        this.maxRawSizeBytes = maxRawSizeBytes;
    }

    public EncodedPayload encodeStep(StepPayload payload) {
        return encode(PayloadFormat.STEP_SCHEMA, payload);
    }

    public EncodedPayload encodeTrace(TracePayload payload) {
        return encode(PayloadFormat.TRACE_SCHEMA, payload);
    }

    public EncodedPayload encodeStepChunk(StepPayloadChunk payload) {
        return encode(PayloadFormat.STEP_CHUNK_SCHEMA, payload);
    }

    public StepPayload decodeStep(byte[] compressed, String expectedSha256, int schemaVersion) {
        JsonNode data = decodeData(
            compressed,
            expectedSha256,
            schemaVersion,
            PayloadFormat.CURRENT_VERSION,
            PayloadFormat.STEP_SCHEMA
        );
        requirePayloadShape(data);
        return convert(data, StepPayload.class);
    }

    public TracePayload decodeTrace(byte[] compressed, String expectedSha256, int schemaVersion) {
        JsonNode data = decodeData(
            compressed,
            expectedSha256,
            schemaVersion,
            PayloadFormat.CURRENT_VERSION,
            PayloadFormat.TRACE_SCHEMA
        );
        requirePayloadShape(data);
        return convert(data, TracePayload.class);
    }

    public StepPayloadChunk decodeStepChunk(byte[] compressed, String expectedSha256, int schemaVersion) {
        JsonNode data = decodeData(
            compressed,
            expectedSha256,
            schemaVersion,
            PayloadFormat.STEP_CHUNK_VERSION,
            PayloadFormat.STEP_CHUNK_SCHEMA
        );
        requireStepChunkShape(data);
        return convert(data, StepPayloadChunk.class);
    }

    private <T> EncodedPayload encode(String schema, T payload) {
        try {
            byte[] raw = objectMapper.writeValueAsBytes(new PayloadEnvelope<>(schema, payload));
            requireWithinLimit(raw.length, maxRawSizeBytes, "Raw payload");
            ByteArrayOutputStream compressed = new ByteArrayOutputStream();
            try (GZIPOutputStream gzip = new GZIPOutputStream(compressed)) {
                gzip.write(raw);
            }
            return new EncodedPayload(raw, compressed.toByteArray(), sha256(raw));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to encode payload", e);
        }
    }

    private JsonNode decodeData(
        byte[] compressed,
        String expectedSha256,
        int schemaVersion,
        int expectedVersion,
        String expectedSchema
    ) {
        try {
            byte[] raw;
            try (
                GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(compressed));
                ByteArrayOutputStream output = new ByteArrayOutputStream()
            ) {
                byte[] buffer = new byte[8192];
                long total = 0;
                int read;
                while ((read = gzip.read(buffer)) != -1) {
                    total += read;
                    requireWithinLimit(total, maxRawSizeBytes, "Decompressed payload");
                    output.write(buffer, 0, read);
                }
                raw = output.toByteArray();
            }
            String actualSha256 = sha256(raw);
            if (!actualSha256.equalsIgnoreCase(expectedSha256)) {
                throw new IllegalStateException("Payload checksum mismatch");
            }
            JsonNode root = objectMapper.readTree(raw);
            if (schemaVersion != expectedVersion) {
                throw new IllegalStateException("Unsupported stored payload schema version: " + schemaVersion);
            }
            if (!root.isObject()
                || !expectedSchema.equals(root.path("schema").asText())
                || !root.has("data")) {
                throw new IllegalStateException("Stored payload schema does not match " + expectedSchema);
            }
            return root.get("data");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to decode payload", e);
        }
    }

    private <T> T convert(JsonNode data, Class<T> payloadType) {
        try {
            return objectMapper.treeToValue(data, payloadType);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to decode payload", e);
        }
    }

    private static void requirePayloadShape(JsonNode data) {
        if (data == null || !data.isObject() || !data.has("input") || !data.has("output")) {
            throw new IllegalStateException("Stored payload must contain input and output");
        }
    }

    private static void requireStepChunkShape(JsonNode data) {
        if (data == null || !data.isObject() || !data.path("steps").isArray()) {
            throw new IllegalStateException("Stored Step chunk must contain a steps array");
        }
        data.path("steps").forEach(entry -> {
            if (!entry.path("id").isTextual()) {
                throw new IllegalStateException("Stored Step chunk entry must contain an id");
            }
            requirePayloadShape(entry);
        });
    }

    private static void requireWithinLimit(long size, long limit, String label) {
        if (size > limit) {
            throw new IllegalArgumentException(label + " exceeds the configured limit of " + limit + " bytes");
        }
    }

    private static String sha256(byte[] value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public record EncodedPayload(byte[] raw, byte[] compressed, String sha256) {
    }

    private record PayloadEnvelope<T>(String schema, T data) {
    }
}
