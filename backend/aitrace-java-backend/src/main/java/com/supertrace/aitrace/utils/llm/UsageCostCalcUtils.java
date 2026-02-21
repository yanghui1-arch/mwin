package com.supertrace.aitrace.utils.llm;

import com.supertrace.aitrace.domain.LLMProvider;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class UsageCostCalcUtils {

    /**
     * Calculates the total cost in USD for a single LLM invocation.

     * Thinking-mode detection
     * If {@code completion_tokens_details.reasoning_tokens > 0} the response used thinking
     * mode. Per Alibaba Cloud billing rules the <em>entire</em> output (reasoning + answer)
     * is then billed at {@code thinking_output_price_per_million}. When no distinct thinking
     * price is configured ({@code null}), the regular output price is used instead.
     */
    public static BigDecimal calcUsageCost(LLMProvider llmProvider, String model, LLMUsage usage) {
        if (usage == null || usage.getPromptTokens() == null || usage.getCompletionTokens() == null) {
            return BigDecimal.ZERO;
        }

        // Resolve pricing once; prompt tokens determine which tier applies
        LLMPricingConfig.ModelPricing pricing = LLMPricingConfig
            .getPricing(llmProvider, model, usage.getPromptTokens())
            .orElse(null);

        // This model is not supporting by the provider
        if (pricing == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal cost = BigDecimal.ZERO;

        // ── Prompt cost ──────────────────────────────────────────────────────────
        LLMUsage.PromptTokensDetails promptDetails = usage.getPromptTokensDetails();
        Integer cachedTokens = (promptDetails != null) ? promptDetails.getCachedTokens() : null;

        if (cachedTokens != null) {
            cost = cost.add(calcCachedPromptTokenCost(pricing, cachedTokens));
            int noCachedTokens = usage.getPromptTokens() - cachedTokens;
            if (noCachedTokens > 0) {
                cost = cost.add(calcPromptTokenCost(pricing, noCachedTokens));
            }
        } else {
            cost = cost.add(calcPromptTokenCost(pricing, usage.getPromptTokens()));
        }

        // ── Completion cost ──────────────────────────────────────────────────────
        // Detect thinking mode: reasoning_tokens > 0 means the model produced a reasoning chain.
        // The entire output is then billed at the thinking rate (not split per token type).
        LLMUsage.CompletionTokensDetails completionDetails = usage.getCompletionTokensDetails();
        boolean isThinking = completionDetails != null
            && completionDetails.getReasoningTokens() != null
            && completionDetails.getReasoningTokens() > 0;

        cost = cost.add(calcCompletionTokenCost(pricing, usage.getCompletionTokens(), isThinking));

        return cost;
    }


    private static BigDecimal calcPromptTokenCost(LLMPricingConfig.ModelPricing pricing, Integer tokens) {
        if (tokens == null || tokens == 0) return BigDecimal.ZERO;
        return pricing.inputPricePerMillion()
            .multiply(BigDecimal.valueOf(tokens))
            .divide(BigDecimal.valueOf(1_000_000), 10, RoundingMode.HALF_UP);
    }

    private static BigDecimal calcCachedPromptTokenCost(LLMPricingConfig.ModelPricing pricing, Integer tokens) {
        if (tokens == null || tokens == 0) return BigDecimal.ZERO;
        // Fall back to regular input price when no separate cache price is published
        BigDecimal price = pricing.cachedInputPricePerMillion() != null
            ? pricing.cachedInputPricePerMillion()
            : pricing.inputPricePerMillion();
        return price
            .multiply(BigDecimal.valueOf(tokens))
            .divide(BigDecimal.valueOf(1_000_000), 10, RoundingMode.HALF_UP);
    }

    /**
     * @param isThinking {@code true} when {@code reasoning_tokens > 0} in the API response.
     *                   Uses {@code thinkingOutputPricePerMillion} if configured, otherwise
     *                   falls back to {@code outputPricePerMillion}.
     */
    private static BigDecimal calcCompletionTokenCost(LLMPricingConfig.ModelPricing pricing, Integer tokens, boolean isThinking) {
        if (tokens == null || tokens == 0) return BigDecimal.ZERO;
        BigDecimal price = (isThinking && pricing.thinkingOutputPricePerMillion() != null)
            ? pricing.thinkingOutputPricePerMillion()
            : pricing.outputPricePerMillion();
        return price
            .multiply(BigDecimal.valueOf(tokens))
            .divide(BigDecimal.valueOf(1_000_000), 10, RoundingMode.HALF_UP);
    }
}
