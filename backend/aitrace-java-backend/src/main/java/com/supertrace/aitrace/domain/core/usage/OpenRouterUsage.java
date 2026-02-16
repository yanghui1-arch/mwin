package com.supertrace.aitrace.domain.core.usage;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * OpenRouter usage implementation.
 * Extends LLMUsage with cost tracking and additional token details.
 *
 * @see <a href="https://openrouter.ai/docs/guides/guides/usage-accounting">OpenRouter Usage Accounting</a>
 */
@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OpenRouterUsage extends LLMUsage {
    private BigDecimal cost;

    @JsonProperty("cost_details")
    private CostDetails costDetails;

    @Override
    public BigDecimal getCost() {
        return cost;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CostDetails {
        @JsonProperty("upstream_inference_cost")
        private Double upstreamInferenceCost;
    }
}
