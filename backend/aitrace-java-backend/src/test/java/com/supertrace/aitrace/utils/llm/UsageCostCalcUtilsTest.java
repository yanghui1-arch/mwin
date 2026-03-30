package com.supertrace.aitrace.utils.llm;

import com.supertrace.aitrace.domain.LLMProvider;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests for {@link UsageCostCalcUtils} focused on the KIMI provider.
 * <p>
 * kimi-k2.5 pricing (from llm-pricing.json):
 *   input  = $0.57 / 1M tokens
 *   output = $3.00 / 1M tokens
 *   no cache price, no tiering, no thinking-mode price
 * </p>
 */
class UsageCostCalcUtilsTest {

    // ── Guard: null / missing data always returns 0 ──────────────────────────

    @Test
    void calcUsageCost_nullUsage_returnsZero() {
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", null);
        assertEquals(BigDecimal.ZERO, cost);
    }

    @Test
    void calcUsageCost_nullProvider_returnsZero() {
        LLMUsage usage = new LLMUsage(1000, 500, 1500, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(null, "kimi-k2.5", usage);
        assertEquals(BigDecimal.ZERO, cost);
    }

    @Test
    void calcUsageCost_nullPromptTokens_returnsZero() {
        LLMUsage usage = new LLMUsage(null, 100, 100, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(BigDecimal.ZERO, cost);
    }

    @Test
    void calcUsageCost_nullCompletionTokens_returnsZero() {
        LLMUsage usage = new LLMUsage(100, null, 100, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(BigDecimal.ZERO, cost);
    }

    @Test
    void calcUsageCost_unknownKimiModel_returnsZero() {
        LLMUsage usage = new LLMUsage(1000, 500, 1500, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "moonshot-unknown", usage);
        assertEquals(BigDecimal.ZERO, cost);
    }

    // ── kimi-k2.5 cost calculation ───────────────────────────────────────────

    @Test
    void calcUsageCost_kimiK25_oneMillionEachToken_returnsInputPluOutputPrice() {
        // 1M input @ $0.57/M + 1M output @ $3.00/M = $3.57
        LLMUsage usage = new LLMUsage(1_000_000, 1_000_000, 2_000_000, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(0, new BigDecimal("3.57").compareTo(cost.stripTrailingZeros()));
    }

    @Test
    void calcUsageCost_kimiK25_partialTokens_returnsProportionalCost() {
        // 1 000 input: 0.57 * 1000 / 1_000_000 = 0.00057
        // 500 output:  3.00 *  500 / 1_000_000 = 0.00150
        // total: 0.00207
        LLMUsage usage = new LLMUsage(1000, 500, 1500, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(0, new BigDecimal("0.00207").compareTo(cost.stripTrailingZeros()));
    }

    @Test
    void calcUsageCost_kimiK25_zeroCompletionTokens_chargesInputOnly() {
        // 1M input @ $0.57/M + 0 output = $0.57
        LLMUsage usage = new LLMUsage(1_000_000, 0, 1_000_000, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(0, new BigDecimal("0.57").compareTo(cost.stripTrailingZeros()));
    }

    @Test
    void calcUsageCost_kimiK25_zeroPromptTokens_chargesOutputOnly() {
        // 0 input + 1M output @ $3.00/M = $3.00
        LLMUsage usage = new LLMUsage(0, 1_000_000, 1_000_000, null, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(0, new BigDecimal("3.00").compareTo(cost.stripTrailingZeros()));
    }

    // ── kimi-k2.5 has no cache price → falls back to regular input price ─────

    @Test
    void calcUsageCost_kimiK25_withCachedTokens_fallsBackToInputPrice() {
        // kimi-k2.5 has no cached_input_price_per_million, so cached tokens
        // are billed at the same $0.57/M rate as regular input tokens.
        // 600 cached + 400 non-cached input = 1000 total input @ $0.57/M
        // 500 output @ $3.00/M
        // expected: 0.57 * 1000/1M + 3.00 * 500/1M = 0.00057 + 0.0015 = 0.00207
        LLMUsage.PromptTokensDetails pd = new LLMUsage.PromptTokensDetails(600, null);
        LLMUsage usage = new LLMUsage(1000, 500, 1500, pd, null);
        BigDecimal cost = UsageCostCalcUtils.calcUsageCost(LLMProvider.KIMI, "kimi-k2.5", usage);
        assertEquals(0, new BigDecimal("0.00207").compareTo(cost.stripTrailingZeros()));
    }
}
