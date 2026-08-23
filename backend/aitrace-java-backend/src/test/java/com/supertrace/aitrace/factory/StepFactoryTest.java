package com.supertrace.aitrace.factory;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.service.storage.PayloadFormat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class StepFactoryTest {

    private StepFactory factory;
    private String payloadObjectKey;

    @BeforeEach
    void setUp() {
        factory = new StepFactory();
        payloadObjectKey = PayloadFormat.stepObjectKey(UUID.randomUUID());
    }

    private LogStepRequest buildRequest(String parentStepId) {
        LogStepRequest req = new LogStepRequest();
        req.setProjectName("my-project");
        req.setStepName("my-step");
        req.setStepId(UUID.randomUUID().toString());
        req.setTraceId(UUID.randomUUID().toString());
        req.setParentStepId(parentStepId);
        req.setStepType("llm_response");
        req.setTags(List.of("tag1", "tag2"));
        req.setInput(Map.of("key", "value"));
        req.setOutput(StepOutput.builder().funcOutput("result").build());
        req.setErrorInfo(null);
        req.setModel("gpt-4o");
        req.setUsage(new LLMUsage(10, 5, 15, null, null));
        req.setStartTime(LocalDateTime.now().minusSeconds(5));
        req.setEndTime(LocalDateTime.now());
        return req;
    }

    @Test
    void createStep_allFieldsMappedCorrectly() {
        String parentStepId = UUID.randomUUID().toString();
        LogStepRequest req = buildRequest(parentStepId);
        Long projectId = 99L;

        Step step = factory.createStep(req, projectId, payloadObjectKey);

        assertEquals(UUID.fromString(req.getStepId()), step.getId());
        assertEquals(req.getStepName(), step.getName());
        assertEquals(UUID.fromString(req.getTraceId()), step.getTraceId());
        assertEquals(UUID.fromString(parentStepId), step.getParentStepId());
        assertEquals(req.getStepType(), step.getType());
        assertEquals(req.getTags(), step.getTags());
        assertEquals(payloadObjectKey, step.getPayloadObjectKey());
        assertNull(step.getErrorInfo());
        assertEquals(req.getModel(), step.getModel());
        assertEquals(req.getUsage(), step.getUsage());
        assertEquals(req.getProjectName(), step.getProjectName());
        assertEquals(projectId, step.getProjectId());
        assertEquals(req.getStartTime(), step.getStartTime());
        assertEquals(req.getEndTime(), step.getEndTime());
    }

    @Test
    void createStep_withoutTraceOrParent_createsStandaloneStep() {
        LogStepRequest req = buildRequest(null);
        req.setTraceId(null);

        Step step = factory.createStep(req, 1L, payloadObjectKey);

        assertNull(step.getTraceId());
        assertNull(step.getParentStepId());
    }

    @Test
    void createStep_rejectsMalformedIdentifiers() {
        assertAll(
            () -> {
                LogStepRequest req = buildRequest(null);
                req.setStepId("not-a-uuid");
                assertThrows(IllegalArgumentException.class,
                    () -> factory.createStep(req, 1L, payloadObjectKey));
            },
            () -> {
                LogStepRequest req = buildRequest(null);
                req.setTraceId("not-a-uuid");
                assertThrows(IllegalArgumentException.class,
                    () -> factory.createStep(req, 1L, payloadObjectKey));
            },
            () -> {
                LogStepRequest req = buildRequest("not-a-uuid");
                assertThrows(IllegalArgumentException.class,
                    () -> factory.createStep(req, 1L, payloadObjectKey));
            }
        );
    }
}
