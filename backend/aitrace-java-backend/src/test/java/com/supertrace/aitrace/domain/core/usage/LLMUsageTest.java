package com.supertrace.aitrace.domain.core.usage;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LLMUsageTest {

    // ──────────────────────────────────────────────────────────────────────────
    // getCost – base class always returns null
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void getCost_baseClass_returnsNull() {
        LLMUsage usage = new LLMUsage();
        assertNull(usage.getCost(), "Base LLMUsage.getCost() must always return null");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // getAudioTokens
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void getAudioTokens_bothDetailsNull_returnsNull() {
        LLMUsage usage = new LLMUsage();
        assertNull(usage.getAudioTokens());
    }

    @Test
    void getAudioTokens_promptDetailsNullCompletionDetailsNull_returnsNull() {
        LLMUsage usage = new LLMUsage(null, null, null, null, null);
        assertNull(usage.getAudioTokens());
    }

    @Test
    void getAudioTokens_onlyPromptAudio_returnPromptAudio() {
        LLMUsage.PromptTokensDetails promptDetails = new LLMUsage.PromptTokensDetails(0, 5);
        LLMUsage usage = new LLMUsage(10, 20, 30, promptDetails, null);
        assertEquals(5, usage.getAudioTokens());
    }

    @Test
    void getAudioTokens_onlyCompletionAudio_returnCompletionAudio() {
        LLMUsage.CompletionTokensDetails completionDetails = new LLMUsage.CompletionTokensDetails(0, 8, 0, 0);
        LLMUsage usage = new LLMUsage(10, 20, 30, null, completionDetails);
        assertEquals(8, usage.getAudioTokens());
    }

    @Test
    void getAudioTokens_bothAudioSet_returnSum() {
        LLMUsage.PromptTokensDetails promptDetails = new LLMUsage.PromptTokensDetails(0, 3);
        LLMUsage.CompletionTokensDetails completionDetails = new LLMUsage.CompletionTokensDetails(0, 7, 0, 0);
        LLMUsage usage = new LLMUsage(10, 20, 30, promptDetails, completionDetails);
        assertEquals(10, usage.getAudioTokens());
    }

    @Test
    void getAudioTokens_audioTokensZero_returnsNull() {
        // Zero audio tokens should return null, not zero (per impl: audio > 0 ? audio : null)
        LLMUsage.PromptTokensDetails promptDetails = new LLMUsage.PromptTokensDetails(5, 0);
        LLMUsage.CompletionTokensDetails completionDetails = new LLMUsage.CompletionTokensDetails(2, 0, 1, 0);
        LLMUsage usage = new LLMUsage(10, 20, 30, promptDetails, completionDetails);
        assertNull(usage.getAudioTokens(), "Zero total audio must return null, not 0");
    }

    @Test
    void getAudioTokens_audioTokensNull_inDetails_returnsNull() {
        // Details exist but audio sub-field is null
        LLMUsage.PromptTokensDetails promptDetails = new LLMUsage.PromptTokensDetails(5, null);
        LLMUsage.CompletionTokensDetails completionDetails = new LLMUsage.CompletionTokensDetails(2, null, 1, 0);
        LLMUsage usage = new LLMUsage(10, 20, 30, promptDetails, completionDetails);
        assertNull(usage.getAudioTokens());
    }
}
