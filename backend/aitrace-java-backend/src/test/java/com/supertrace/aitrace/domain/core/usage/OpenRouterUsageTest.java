package com.supertrace.aitrace.domain.core.usage;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class OpenRouterUsageTest {

    @Test
    void getCost_whenCostIsSet_returnsCost() {
        OpenRouterUsage usage = new OpenRouterUsage(new BigDecimal("0.00123"), null);
        assertEquals(new BigDecimal("0.00123"), usage.getCost());
    }

    @Test
    void getCost_whenCostIsNull_returnsNull() {
        OpenRouterUsage usage = new OpenRouterUsage(null, null);
        assertNull(usage.getCost());
    }

    @Test
    void getCost_overridesBaseClass_doesNotReturnNull() {
        // Base class always returns null; OpenRouterUsage must return the real cost
        OpenRouterUsage usage = new OpenRouterUsage(BigDecimal.ONE, null);
        LLMUsage asBase = usage;          // upcast
        assertEquals(BigDecimal.ONE, asBase.getCost(), "Polymorphic getCost() must return OpenRouter cost");
    }

    @Test
    void costDetails_upstreamInferenceCost_stored() {
        OpenRouterUsage.CostDetails details = new OpenRouterUsage.CostDetails(0.005);
        OpenRouterUsage usage = new OpenRouterUsage(BigDecimal.TEN, details);
        assertNotNull(usage.getCostDetails());
        assertEquals(0.005, usage.getCostDetails().getUpstreamInferenceCost());
    }

    @Test
    void inheritedFields_accessible() {
        OpenRouterUsage usage = new OpenRouterUsage(BigDecimal.ONE, null);
        usage.setPromptTokens(100);
        usage.setCompletionTokens(50);
        usage.setTotalTokens(150);
        assertEquals(100, usage.getPromptTokens());
        assertEquals(50, usage.getCompletionTokens());
        assertEquals(150, usage.getTotalTokens());
    }
}
