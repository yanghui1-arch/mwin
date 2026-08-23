package com.supertrace.aitrace.service.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.service.storage.model.StepPayload;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PayloadCodecTest {
    @Test
    void encodeAndDecode_roundTripsCombinedPayload() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        PayloadCodec codec = new PayloadCodec(mapper, 1024 * 1024);
        Map<String, Object> input = Map.of("prefix", "shared-prefix-".repeat(1000));
        Map<String, Object> output = Map.of("result", "ok");
        StepPayload payload = new StepPayload(mapper.valueToTree(input), mapper.valueToTree(output));

        PayloadCodec.EncodedPayload encoded = codec.encodeStep(payload);
        StepPayload decoded = codec.decodeStep(
            encoded.compressed(),
            encoded.sha256(),
            PayloadFormat.CURRENT_VERSION
        );

        assertTrue(encoded.compressed().length < encoded.raw().length);
        assertEquals(PayloadFormat.STEP_SCHEMA, mapper.readTree(encoded.raw()).path("schema").asText());
        assertEquals(payload, decoded);
    }

    @Test
    void decode_rejectsUntrustedChecksumVersionAndPayloadType() {
        ObjectMapper mapper = new ObjectMapper();
        PayloadCodec codec = new PayloadCodec(mapper, 1024 * 1024);
        PayloadCodec.EncodedPayload encoded = codec.encodeStep(new StepPayload(
            mapper.valueToTree(Map.of("value", "a")),
            mapper.createObjectNode()
        ));

        assertAll(
            () -> assertThrows(
                IllegalStateException.class,
                () -> codec.decodeStep(
                    encoded.compressed(),
                    "0".repeat(64),
                    PayloadFormat.CURRENT_VERSION
                )
            ),
            () -> assertThrows(
                IllegalStateException.class,
                () -> codec.decodeStep(
                    encoded.compressed(),
                    encoded.sha256(),
                    PayloadFormat.CURRENT_VERSION + 1
                )
            ),
            () -> {
                IllegalStateException error = assertThrows(
                    IllegalStateException.class,
                    () -> codec.decodeTrace(
                        encoded.compressed(),
                        encoded.sha256(),
                        PayloadFormat.CURRENT_VERSION
                    )
                );
                assertTrue(error.getMessage().contains(PayloadFormat.TRACE_SCHEMA));
            }
        );
    }

    @Test
    void sizeLimits_applyBeforeUploadAndDuringDecompression() {
        ObjectMapper mapper = new ObjectMapper();
        PayloadCodec smallCodec = new PayloadCodec(mapper, 32);
        PayloadCodec normalCodec = new PayloadCodec(mapper, 1024 * 1024);
        StepPayload oversizedPayload = new StepPayload(
            mapper.valueToTree(Map.of("value", "x".repeat(64))),
            mapper.createObjectNode()
        );
        PayloadCodec.EncodedPayload encoded = normalCodec.encodeStep(oversizedPayload);

        assertAll(
            () -> assertThrows(
                IllegalArgumentException.class,
                () -> smallCodec.encodeStep(oversizedPayload)
            ),
            () -> assertThrows(
                IllegalArgumentException.class,
                () -> smallCodec.decodeStep(
                    encoded.compressed(),
                    encoded.sha256(),
                    PayloadFormat.CURRENT_VERSION
                )
            )
        );
    }
}
