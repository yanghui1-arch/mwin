package com.supertrace.aitrace.domain.core.usage;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * Google Gemini usage implementation.
 * Extends LLMUsage with Gemini-specific fields.
 *
 * @see <a href="https://ai.google.dev/gemini-api/docs">Gemini API Documentation</a>
 */
@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GeminiUsage extends LLMUsage {
    @JsonProperty("cached_content_token_count")
    private Integer cachedContentTokenCount;

    @JsonProperty("candidates_token_count")
    private Integer candidatesTokenCount;

    @Override
    public Integer getCompletionTokens() {
        Integer base = super.getCompletionTokens();
        return base != null ? base : candidatesTokenCount;
    }
}
