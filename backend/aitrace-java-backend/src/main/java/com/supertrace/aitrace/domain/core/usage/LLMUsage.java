package com.supertrace.aitrace.domain.core.usage;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Common interface for all LLM provider usage tracking.
 * Defines the contract that all provider-specific usage implementations must fulfill.
 * <p>
 * Implementations: OpenAIUsage, OpenRouterUsage, GeminiUsage, etc.
 * </p>
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.EXTERNAL_PROPERTY,
    property = "llm_provider",
    visible = true
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = OpenAIUsage.class, names = "openai"),
    @JsonSubTypes.Type(value = OpenRouterUsage.class, name = "open_router"),
})
public interface LLMUsage {
    /**
     * Get the number of tokens in the prompt/input.
     *
     * @return prompt tokens count, or null if not available
     */
    Integer getPromptTokens();

    /**
     * Get the number of tokens in the completion/output.
     *
     * @return completion tokens count, or null if not available
     */
    Integer getCompletionTokens();

    /**
     * Get the total number of tokens used (prompt + completion).
     *
     * @return total tokens count, or null if not available
     */
    Integer getTotalTokens();

    /**
     * Get the number of audio tokens (input or output).
     * Returns null if audio is not applicable or not available.
     *
     * @return audio tokens count, or null if not available
     */
    Integer getAudioTokens();

    /**
     * Get the cost of this API call in the provider's currency (usually USD or credits).
     * Returns null if cost information is not available.
     *
     * @return cost amount, or null if not available
     */
    Double getCost();

    /**
     * Check if the usage data is valid (e.g., total = prompt + completion).
     *
     * @return true if valid, false otherwise
     */
    default boolean isValid() {
        if (getTotalTokens() == null || getPromptTokens() == null || getCompletionTokens() == null) {
            return true; // Allow null values
        }
        return getTotalTokens().equals(getPromptTokens() + getCompletionTokens());
    }
}
