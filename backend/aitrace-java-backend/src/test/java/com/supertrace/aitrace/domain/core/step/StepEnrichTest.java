package com.supertrace.aitrace.domain.core.step;

import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.domain.core.usage.OpenRouterUsage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for {@link Step#enrich(List, Map, StepOutput, String, LLMUsage)}.

 * The method must:
 * 1. Merge tags (union, de-duplicate, no nulls)
 * 2. Prefer new input fields, keep old when new field is absent
 * 3. Prefer new output fields, keep old when new field is absent
 * 4. Prefer new model, keep old when new model is null
 * 5. Prefer new usage, keep old when new usage is null
 * 6. Mutate and return the same Step instance
 */
class StepEnrichTest {

    private Step step;

    @BeforeEach
    void setUp() {
        Map<String, Object> input = new HashMap<>();
        input.put("func_inputs", "old_func");
        input.put("llm_inputs", "old_llm");

        StepOutput output = StepOutput.builder()
            .funcOutput("old_func_out")
            .llmOutputs("old_llm_out")
            .build();

        step = Step.builder()
            .id(UUID.randomUUID())
            .name("test-step")
            .traceId(UUID.randomUUID())
            .type("llm_response")
            .tags(new ArrayList<>(List.of("existing-tag")))
            .input(input)
            .output(output)
            .model("gpt-3.5-turbo")
            .usage(new LLMUsage(100, 50, 150, null, null))
            .projectName("my-project")
            .projectId(1L)
            .build();
    }

    // ── Tags ─────────────────────────────────────────────────────────────────

    @Test
    void enrich_tags_mergesAndDeDuplicates() {
        List<String> newTags = List.of("new-tag", "existing-tag");
        StepOutput emptyOutput = StepOutput.builder().build();

        step.enrich(newTags, new HashMap<>(), emptyOutput, null, null);

        List<String> tags = step.getTags();
        assertTrue(tags.contains("new-tag"));
        assertTrue(tags.contains("existing-tag"));
        // No duplicates
        assertEquals(tags.stream().distinct().count(), tags.size());
    }

    @Test
    void enrich_tags_nullNewTags_keepsOldTags() {
        StepOutput emptyOutput = StepOutput.builder().build();
        step.enrich(null, new HashMap<>(), emptyOutput, null, null);
        assertTrue(step.getTags().contains("existing-tag"));
    }

    @Test
    void enrich_tags_nullOldTags_usesNewTags() {
        step.setTags(null);
        StepOutput emptyOutput = StepOutput.builder().build();
        step.enrich(List.of("fresh-tag"), new HashMap<>(), emptyOutput, null, null);
        assertTrue(step.getTags().contains("fresh-tag"));
    }

    @Test
    void enrich_tags_doesNotContainNulls() {
        List<String> newTagsWithNull = new ArrayList<>();
        newTagsWithNull.add(null);
        newTagsWithNull.add("valid-tag");
        StepOutput emptyOutput = StepOutput.builder().build();

        step.enrich(newTagsWithNull, new HashMap<>(), emptyOutput, null, null);

        assertFalse(step.getTags().contains(null), "Null tags must be filtered out");
    }

    // ── Input ────────────────────────────────────────────────────────────────

    @Test
    void enrich_input_newFuncInputsOverridesOld() {
        Map<String, Object> newInput = new HashMap<>();
        newInput.put("func_inputs", "new_func");
        StepOutput emptyOutput = StepOutput.builder().build();

        step.enrich(List.of(), newInput, emptyOutput, null, null);

        assertEquals("new_func", step.getInput().get("func_inputs"));
    }

    @Test
    void enrich_input_nullNewFuncInputs_keepsOld() {
        Map<String, Object> newInput = new HashMap<>();
        newInput.put("func_inputs", null);
        newInput.put("llm_inputs", null);
        StepOutput emptyOutput = StepOutput.builder().build();

        step.enrich(List.of(), newInput, emptyOutput, null, null);

        // When new is null, fall back to old
        assertEquals("old_func", step.getInput().get("func_inputs"));
        assertEquals("old_llm", step.getInput().get("llm_inputs"));
    }

    @Test
    void enrich_input_newLlmInputsOverridesOld() {
        Map<String, Object> newInput = new HashMap<>();
        newInput.put("llm_inputs", "new_llm");
        StepOutput emptyOutput = StepOutput.builder().build();

        step.enrich(List.of(), newInput, emptyOutput, null, null);

        assertEquals("new_llm", step.getInput().get("llm_inputs"));
    }

    // ── Output ───────────────────────────────────────────────────────────────

    @Test
    void enrich_output_newFuncOutputOverridesOld() {
        StepOutput newOutput = StepOutput.builder().funcOutput("new_func_out").build();
        step.enrich(List.of(), new HashMap<>(), newOutput, null, null);
        assertEquals("new_func_out", step.getOutput().getFuncOutput());
    }

    @Test
    void enrich_output_nullNewFuncOutput_keepsOld() {
        StepOutput newOutput = StepOutput.builder().funcOutput(null).build();
        step.enrich(List.of(), new HashMap<>(), newOutput, null, null);
        assertEquals("old_func_out", step.getOutput().getFuncOutput());
    }

    @Test
    void enrich_output_newLlmOutputsOverridesOld() {
        StepOutput newOutput = StepOutput.builder().llmOutputs("new_llm_out").build();
        step.enrich(List.of(), new HashMap<>(), newOutput, null, null);
        assertEquals("new_llm_out", step.getOutput().getLlmOutputs());
    }

    @Test
    void enrich_output_nullNewLlmOutputs_keepsOld() {
        StepOutput newOutput = StepOutput.builder().llmOutputs(null).build();
        step.enrich(List.of(), new HashMap<>(), newOutput, null, null);
        assertEquals("old_llm_out", step.getOutput().getLlmOutputs());
    }

    // ── Model ────────────────────────────────────────────────────────────────

    @Test
    void enrich_model_newModelOverridesOld() {
        StepOutput emptyOutput = StepOutput.builder().build();
        step.enrich(List.of(), new HashMap<>(), emptyOutput, "gpt-4o", null);
        assertEquals("gpt-4o", step.getModel());
    }

    @Test
    void enrich_model_nullNewModel_keepsOldModel() {
        StepOutput emptyOutput = StepOutput.builder().build();
        step.enrich(List.of(), new HashMap<>(), emptyOutput, null, null);
        assertEquals("gpt-3.5-turbo", step.getModel());
    }

    // ── Usage ────────────────────────────────────────────────────────────────

    @Test
    void enrich_usage_newUsageOverridesOld() {
        OpenRouterUsage newUsage = new OpenRouterUsage(new BigDecimal("0.005"), null);
        StepOutput emptyOutput = StepOutput.builder().build();
        step.enrich(List.of(), new HashMap<>(), emptyOutput, null, newUsage);
        assertSame(newUsage, step.getUsage());
    }

    @Test
    void enrich_usage_nullNewUsage_keepsOldUsage() {
        LLMUsage oldUsage = step.getUsage();
        StepOutput emptyOutput = StepOutput.builder().build();
        step.enrich(List.of(), new HashMap<>(), emptyOutput, null, null);
        assertSame(oldUsage, step.getUsage());
    }

    // ── Return value ─────────────────────────────────────────────────────────

    @Test
    void enrich_returnsTheSameInstance() {
        StepOutput emptyOutput = StepOutput.builder().build();
        Step result = step.enrich(List.of(), new HashMap<>(), emptyOutput, "claude-3", null);
        assertSame(step, result, "enrich() must return the same Step instance (fluent mutator)");
    }
}
