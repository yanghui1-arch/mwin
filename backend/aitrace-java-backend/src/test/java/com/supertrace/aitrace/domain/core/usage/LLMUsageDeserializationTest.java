package com.supertrace.aitrace.domain.core.usage;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests the class-level {@code @JsonTypeInfo} on {@link LLMUsage} that embeds
 * {@code "llm_provider"} inside the JSON.  This is used when reading LLMUsage
 * back from the database JSONB column.
 */
class LLMUsageDeserializationTest {

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
    }

    // ── "openai" type discriminator → LLMUsage ───────────────────────────────

    @Test
    void deserialize_llmProviderOpenai_returnsLLMUsageBase() throws Exception {
        String json = """
            {
                "llm_provider": "openai",
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150
            }
            """;

        LLMUsage usage = mapper.readValue(json, LLMUsage.class);

        assertNotNull(usage);
        assertEquals(LLMUsage.class, usage.getClass());
        assertEquals(100, usage.getPromptTokens());
        assertEquals(50, usage.getCompletionTokens());
        assertEquals(150, usage.getTotalTokens());
    }

    // ── "open_router" type discriminator → OpenRouterUsage ──────────────────

    @Test
    void deserialize_llmProviderOpenRouter_returnsOpenRouterUsage() throws Exception {
        String json = """
            {
                "llm_provider": "open_router",
                "prompt_tokens": 200,
                "completion_tokens": 80,
                "total_tokens": 280,
                "cost": "0.0042",
                "cost_details": { "upstream_inference_cost": 0.004 }
            }
            """;

        LLMUsage usage = mapper.readValue(json, LLMUsage.class);

        assertNotNull(usage);
        assertInstanceOf(OpenRouterUsage.class, usage);
        OpenRouterUsage orUsage = (OpenRouterUsage) usage;
        assertEquals(200, orUsage.getPromptTokens());
        assertEquals(new BigDecimal("0.0042"), orUsage.getCost());
        assertNotNull(orUsage.getCostDetails());
    }

    // ── No type discriminator → defaultImpl LLMUsage ─────────────────────────

    @Test
    void deserialize_noLlmProvider_usesDefaultImplLLMUsage() throws Exception {
        String json = """
            {
                "prompt_tokens": 55,
                "completion_tokens": 22,
                "total_tokens": 77
            }
            """;

        LLMUsage usage = mapper.readValue(json, LLMUsage.class);

        assertNotNull(usage);
        assertInstanceOf(LLMUsage.class, usage);
        assertEquals(55, usage.getPromptTokens());
    }

    // ── Unknown type discriminator → ignored, defaults to LLMUsage ───────────

    @Test
    void deserialize_unknownLlmProvider_doesNotThrow() throws Exception {
        String json = """
            {
                "llm_provider": "anthropic_future_unknown",
                "prompt_tokens": 10
            }
            """;

        // @JsonIgnoreProperties(ignoreUnknown = true) is on the base class.
        // An unknown type name should fall back to defaultImpl = LLMUsage.class
        LLMUsage usage = mapper.readValue(json, LLMUsage.class);
        assertNotNull(usage);
    }

    // ── Serialization round-trip: OpenRouterUsage → JSON → LLMUsage ──────────

    @Test
    void roundTrip_openRouterUsage_preservesType() throws Exception {
        OpenRouterUsage original = new OpenRouterUsage(new BigDecimal("0.005"), null);
        original.setPromptTokens(100);
        original.setCompletionTokens(40);
        original.setTotalTokens(140);

        String json = mapper.writeValueAsString(original);
        LLMUsage deserialized = mapper.readValue(json, LLMUsage.class);

        assertInstanceOf(OpenRouterUsage.class, deserialized);
        assertEquals(new BigDecimal("0.005"), deserialized.getCost());
        assertEquals(100, deserialized.getPromptTokens());
    }

    @Test
    void roundTrip_baseLLMUsage_preservesType() throws Exception {
        LLMUsage original = new LLMUsage(50, 30, 80, null, null);

        String json = mapper.writeValueAsString(original);
        LLMUsage deserialized = mapper.readValue(json, LLMUsage.class);

        assertEquals(LLMUsage.class, deserialized.getClass());
        assertEquals(50, deserialized.getPromptTokens());
    }
}
