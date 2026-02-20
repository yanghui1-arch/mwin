package com.supertrace.aitrace.factory;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class StepFactoryTest {

    private StepFactory factory;

    @BeforeEach
    void setUp() {
        factory = new StepFactory();
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
        LogStepRequest req = buildRequest(null);
        Long projectId = 99L;

        Step step = factory.createStep(req, projectId);

        assertEquals(UUID.fromString(req.getStepId()), step.getId());
        assertEquals(req.getStepName(), step.getName());
        assertEquals(UUID.fromString(req.getTraceId()), step.getTraceId());
        assertNull(step.getParentStepId());
        assertEquals(req.getStepType(), step.getType());
        assertEquals(req.getTags(), step.getTags());
        assertEquals(req.getInput(), step.getInput());
        assertEquals(req.getOutput(), step.getOutput());
        assertNull(step.getErrorInfo());
        assertEquals(req.getModel(), step.getModel());
        assertEquals(req.getUsage(), step.getUsage());
        assertEquals(req.getProjectName(), step.getProjectName());
        assertEquals(projectId, step.getProjectId());
        assertEquals(req.getStartTime(), step.getStartTime());
        assertEquals(req.getEndTime(), step.getEndTime());
    }

    @Test
    void createStep_withParentStepId_parsesUUID() {
        String parentId = UUID.randomUUID().toString();
        LogStepRequest req = buildRequest(parentId);

        Step step = factory.createStep(req, 1L);

        assertEquals(UUID.fromString(parentId), step.getParentStepId());
    }

    @Test
    void createStep_nullParentStepId_setsNullOnStep() {
        LogStepRequest req = buildRequest(null);

        Step step = factory.createStep(req, 1L);

        assertNull(step.getParentStepId());
    }

    @Test
    void createStep_differentProjectIds_areAssignedCorrectly() {
        LogStepRequest req = buildRequest(null);

        Step step1 = factory.createStep(req, 10L);
        Step step2 = factory.createStep(req, 20L);

        assertEquals(10L, step1.getProjectId());
        assertEquals(20L, step2.getProjectId());
    }

    @Test
    void createStep_invalidStepIdString_throwsException() {
        LogStepRequest req = buildRequest(null);
        req.setStepId("not-a-uuid");

        assertThrows(IllegalArgumentException.class, () -> factory.createStep(req, 1L));
    }

    @Test
    void createStep_invalidTraceIdString_throwsException() {
        LogStepRequest req = buildRequest(null);
        req.setTraceId("bad-uuid");

        assertThrows(IllegalArgumentException.class, () -> factory.createStep(req, 1L));
    }
}
