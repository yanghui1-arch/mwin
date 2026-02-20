package com.supertrace.aitrace.dto.step;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.domain.core.usage.OpenRouterUsage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests polymorphic deserialization of {@link LogStepRequest#getUsage()}.

 * The JSON field {@code llm_provider} acts as the EXTERNAL type discriminator for
 * the {@code usage} field.  The correct subclass is instantiated based on that
 * discriminator value.
 *
 * <p><b>Key constraint (Jackson EXTERNAL_PROPERTY):</b> if {@code llm_provider} is
 * present in the JSON, {@code usage} MUST also be present.  Sending {@code llm_provider}
 * without {@code usage} throws {@link MismatchedInputException}.</p>
 */
class LogStepRequestDeserializationTest {

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // ── Discriminator: "openai" ───────────────────────────────────────────────

    @Test
    void deserialize_llmProviderOpenai_producesLLMUsageInstance() throws Exception {
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": ["t1"],
                "llm_provider": "openai",
                "usage": {
                    "prompt_tokens": 100,
                    "completion_tokens": 50,
                    "total_tokens": 150
                },
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        LogStepRequest req = mapper.readValue(json, LogStepRequest.class);

        assertNotNull(req.getUsage());
        assertEquals(LLMUsage.class, req.getUsage().getClass());
        assertEquals(100, req.getUsage().getPromptTokens());
        assertEquals(50, req.getUsage().getCompletionTokens());
        assertEquals(150, req.getUsage().getTotalTokens());
    }

    // ── Discriminator: "open_router" ─────────────────────────────────────────

    @Test
    void deserialize_llmProviderOpenRouter_producesOpenRouterUsageInstance() throws Exception {
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": ["t1"],
                "llm_provider": "open_router",
                "usage": {
                    "prompt_tokens": 200,
                    "completion_tokens": 80,
                    "total_tokens": 280,
                    "cost": 0.0042,
                    "cost_details": { "upstream_inference_cost": 0.004 }
                },
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        LogStepRequest req = mapper.readValue(json, LogStepRequest.class);

        assertNotNull(req.getUsage());
        assertInstanceOf(OpenRouterUsage.class, req.getUsage());

        OpenRouterUsage openRouterUsage = (OpenRouterUsage) req.getUsage();
        assertEquals(200, openRouterUsage.getPromptTokens());
        assertEquals(new BigDecimal("0.0042"), openRouterUsage.getCost());
        assertNotNull(openRouterUsage.getCostDetails());
        assertEquals(0.004, openRouterUsage.getCostDetails().getUpstreamInferenceCost());
    }

    // ── No llm_provider and no usage → usage is null ─────────────────────────

    @Test
    void deserialize_noLlmProviderAndNoUsage_usageIsNull() throws Exception {
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": [],
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        LogStepRequest req = mapper.readValue(json, LogStepRequest.class);

        assertNull(req.getUsage());
        assertNull(req.getLlmProvider());
    }

    // ── llm_provider present but usage absent → Jackson constraint violation ──

    @Test
    void deserialize_llmProviderPresentButUsageAbsent_throwsMismatchedInputException() {
        // Jackson EXTERNAL_PROPERTY constraint: when the type discriminator (llm_provider)
        // is present, the target field (usage) MUST also be present in the JSON.
        // This is a real API constraint: clients cannot send llm_provider without usage.
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": [],
                "llm_provider": "openai",
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        assertThrows(MismatchedInputException.class,
            () -> mapper.readValue(json, LogStepRequest.class),
            "Jackson must throw when llm_provider is present but usage field is absent");
    }

    // ── llmProvider field on the DTO is set from JSON ─────────────────────────

    @Test
    void deserialize_openRouterProvider_llmProviderFieldSetOnRequest() throws Exception {
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": [],
                "llm_provider": "open_router",
                "usage": { "cost": 0.001 },
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        LogStepRequest req = mapper.readValue(json, LogStepRequest.class);

        assertEquals("open_router", req.getLlmProvider());
    }

    @Test
    void deserialize_openaiProvider_llmProviderFieldSetOnRequest() throws Exception {
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": [],
                "llm_provider": "openai",
                "usage": { "prompt_tokens": 10 },
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        LogStepRequest req = mapper.readValue(json, LogStepRequest.class);

        assertEquals("openai", req.getLlmProvider());
    }

    // ── Common request fields mapped correctly ────────────────────────────────

    @Test
    void deserialize_commonFields_mappedCorrectly() throws Exception {
        String json = """
            {
                "project_name": "p1",
                "step_name": "s1",
                "step_id": "00000000-0000-0000-0000-000000000001",
                "trace_id": "00000000-0000-0000-0000-000000000002",
                "step_type": "llm_response",
                "tags": ["t1"],
                "llm_provider": "openai",
                "usage": { "prompt_tokens": 5 },
                "start_time": "2024-01-01 10:00:00"
            }
            """;

        LogStepRequest req = mapper.readValue(json, LogStepRequest.class);

        assertEquals("p1", req.getProjectName());
        assertEquals("s1", req.getStepName());
        assertEquals("00000000-0000-0000-0000-000000000001", req.getStepId());
        assertEquals("00000000-0000-0000-0000-000000000002", req.getTraceId());
        assertEquals("llm_response", req.getStepType());
        assertEquals(1, req.getTags().size());
        assertEquals("t1", req.getTags().get(0));
    }
}
