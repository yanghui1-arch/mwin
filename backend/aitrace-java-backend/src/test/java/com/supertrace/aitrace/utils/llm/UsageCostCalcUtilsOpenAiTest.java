package com.supertrace.aitrace.utils.llm;

import com.supertrace.aitrace.domain.LLMProvider;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UsageCostCalcUtilsOpenAiTest {

    @Test
    void calcUsageCost_gpt55_firstTier_withCachedTokens_usesConfiguredPricing() {
        // gpt-5.5 first tier pricing:
        // cached input = $0.003857/M, regular input = $0.03857/M, output = $0.231428/M
        // 600 cached + 400 regular input + 500 output
        // expected: 0.003857 * 600/1M + 0.03857 * 400/1M + 0.231428 * 500/1M = 0.0001334562
        LLMUsage.PromptTokensDetails promptDetails = new LLMUsage.PromptTokensDetails(600, null);
        LLMUsage usage = new LLMUsage(1000, 500, 1500, promptDetails, null);

        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.OPENAI, "gpt-5.5", usage);

        assertEquals(0, new BigDecimal("0.0001334562").compareTo(cost.stripTrailingZeros()));
    }

    @Test
    void calcUsageCost_gpt55_largeContext_usesSecondTierPricing() {
        // gpt-5.5 second tier applies above 272,000 prompt tokens:
        // input = $0.07714/M, output = $0.34714/M
        // 300,000 input + 1,000 output
        // expected: 0.07714 * 300000/1M + 0.34714 * 1000/1M = 0.02348914
        LLMUsage usage = new LLMUsage(300_000, 1_000, 301_000, null, null);

        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.OPENAI, "gpt-5.5", usage);

        assertEquals(0, new BigDecimal("0.02348914").compareTo(cost.stripTrailingZeros()));
    }
}
