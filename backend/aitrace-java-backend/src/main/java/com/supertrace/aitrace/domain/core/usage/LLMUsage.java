package com.supertrace.aitrace.domain.core.usage;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Base class for all LLM provider usage tracking.
 * Contains common fields shared by OpenAI, OpenRouter, Gemini, etc.
 * <p>
 * For OpenAI-compatible providers (OpenAI, Azure, DeepSeek, vLLM, Ollama),
 * this class can be used directly.
 * For providers with extra fields, use subclasses: OpenRouterUsage, GeminiUsage, etc.
 * </p>
 * <p>
 * {@code @JsonTypeInfo} with {@code @type} property is used for Hibernate JSONB
 * serialization/deserialization so that subclass type information is preserved in the database.
 * </p>
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "@type",
    defaultImpl = LLMUsage.class
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = LLMUsage.class, name = "base"),
    @JsonSubTypes.Type(value = OpenRouterUsage.class, name = "open_router"),
    @JsonSubTypes.Type(value = GeminiUsage.class, name = "google")
})
@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LLMUsage {
    @JsonProperty("prompt_tokens")
    private Integer promptTokens;

    @JsonProperty("completion_tokens")
    private Integer completionTokens;

    @JsonProperty("total_tokens")
    private Integer totalTokens;

    @JsonProperty("prompt_tokens_details")
    private PromptTokensDetails promptTokensDetails;

    @JsonProperty("completion_tokens_details")
    private CompletionTokensDetails completionTokensDetails;

    public Integer getAudioTokens() {
        int audio = 0;
        if (promptTokensDetails != null && promptTokensDetails.getAudioTokens() != null) {
            audio += promptTokensDetails.getAudioTokens();
        }
        if (completionTokensDetails != null && completionTokensDetails.getAudioTokens() != null) {
            audio += completionTokensDetails.getAudioTokens();
        }
        return audio > 0 ? audio : null;
    }

    public BigDecimal getCost() {
        return null;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromptTokensDetails {
        @JsonProperty("cached_tokens")
        private Integer cachedTokens;

        @JsonProperty("audio_tokens")
        private Integer audioTokens;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletionTokensDetails {
        @JsonProperty("reasoning_tokens")
        private Integer reasoningTokens;

        @JsonProperty("audio_tokens")
        private Integer audioTokens;

        @JsonProperty("accepted_prediction_tokens")
        private Integer acceptedPredictionTokens;

        @JsonProperty("rejected_prediction_tokens")
        private Integer rejectedPredictionTokens;
    }
}
