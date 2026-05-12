package com.supertrace.aitrace.domain.core.usage;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GeminiUsageTest {

    // ──────────────────────────────────────────────────────────────────────────
    // getCompletionTokens – Gemini overrides to fall back to candidatesTokenCount
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void getCompletionTokens_baseFieldSet_returnsBaseValue() {
        GeminiUsage usage = new GeminiUsage(null, 50);
        // Set completion tokens via parent setter
        usage.setCompletionTokens(100);
        assertEquals(100, usage.getCompletionTokens());
    }

    @Test
    void getCompletionTokens_baseNull_fallsBackToCandidatesTokenCount() {
        // completion_tokens not set → should return candidatesTokenCount
        GeminiUsage usage = new GeminiUsage(null, 77);
        usage.setCompletionTokens(null);
        assertEquals(77, usage.getCompletionTokens());
    }

    @Test
    void getCompletionTokens_bothNull_returnsNull() {
        GeminiUsage usage = new GeminiUsage(null, null);
        usage.setCompletionTokens(null);
        assertNull(usage.getCompletionTokens());
    }

    @Test
    void getCompletionTokens_baseZero_returnsZeroNotFallback() {
        // Explicit 0 is a valid value – do NOT fall back to candidatesTokenCount
        GeminiUsage usage = new GeminiUsage(null, 99);
        usage.setCompletionTokens(0);
        assertEquals(0, usage.getCompletionTokens());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // getCost – Gemini does not override getCost → must return null
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void getCost_geminiUsage_returnsNull() {
        GeminiUsage usage = new GeminiUsage(10, 20);
        assertNull(usage.getCost(), "GeminiUsage does not track cost – getCost() must return null");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Inherited getAudioTokens still works
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void getAudioTokens_inheritedBehaviour_works() {
        GeminiUsage usage = new GeminiUsage(null, null);
        LLMUsage.PromptTokensDetails pd = new LLMUsage.PromptTokensDetails(0, 4);
        usage.setPromptTokensDetails(pd);
        assertEquals(4, usage.getAudioTokens());
    }
}
