package com.supertrace.aitrace.utils.llm;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.domain.LLMProvider;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * Loads LLM model pricing from {@code classpath:llm-pricing.json}.
 * All prices are in USD per 1,000,000 tokens.
 *
 * <h3>Tiered pricing</h3>
 * Each model contains an ordered {@code tiers} array (smallest → largest context window).
 * The last tier has no {@code max_context_tokens} and acts as the catch-all.
 *
 * <h3>Thinking-mode billing</h3>
 * Some models bill thinking-mode output at a different rate than non-thinking output.
 * The billing rule (per Alibaba Cloud documentation) is:
 * <ul>
 *   <li>When the model produces reasoning tokens ({@code reasoning_tokens > 0}), the
 *       <em>entire</em> output (reasoning + answer) is billed at the thinking-mode rate.</li>
 *   <li>When no reasoning tokens are produced, the non-thinking rate applies.</li>
 *   <li>It is <strong>not</strong> split billing — there is one rate per response.</li>
 * </ul>
 * {@code thinking_output_price_per_million} is omitted from the JSON when it equals
 * {@code output_price_per_million}; callers should fall back to the regular output price
 * when the field is {@code null}.
 */
public class LLMPricingConfig {

    private static final Logger log = Logger.getLogger(LLMPricingConfig.class.getName());
    private static final String PRICING_FILE = "/llm-pricing.json";

    // ── Public API types ────────────────────────────────────────────────────────

    /**
     * Effective (tier-resolved) pricing for a single model invocation.
     * All prices are USD / 1 M tokens.
     *
     * @param inputPricePerMillion          regular (non-cached) input tokens
     * @param cachedInputPricePerMillion    cache-read input tokens; {@code null} = not published,
     *                                      fall back to {@code inputPricePerMillion}
     * @param outputPricePerMillion         non-thinking output tokens
     * @param thinkingOutputPricePerMillion thinking-mode output tokens; {@code null} = same as
     *                                      {@code outputPricePerMillion}
     */
    public record ModelPricing(
        BigDecimal inputPricePerMillion,
        BigDecimal cachedInputPricePerMillion,
        BigDecimal outputPricePerMillion,
        BigDecimal thinkingOutputPricePerMillion
    ) {}

    // ── Internal deserialization types ─────────────────────────────────────────

    record PricingTier(
        @JsonProperty("max_context_tokens")                  Integer    maxContextTokens,
        @JsonProperty("input_price_per_million")             BigDecimal inputPricePerMillion,
        @JsonProperty("cached_input_price_per_million")      BigDecimal cachedInputPricePerMillion,
        @JsonProperty("output_price_per_million")            BigDecimal outputPricePerMillion,
        @JsonProperty("thinking_output_price_per_million")   BigDecimal thinkingOutputPricePerMillion
    ) {
        ModelPricing toModelPricing() {
            return new ModelPricing(
                inputPricePerMillion,
                cachedInputPricePerMillion,
                outputPricePerMillion,
                thinkingOutputPricePerMillion
            );
        }
    }

    record ModelConfig(
        @JsonProperty("tiers") List<PricingTier> tiers
    ) {}

    // ── Loaded data ─────────────────────────────────────────────────────────────

    /** key = "PROVIDER_NAME:model-id", value = ordered tier list (small → large context) */
    private static final Map<String, List<PricingTier>> PRICING;

    static {
        Map<String, List<PricingTier>> loaded = new HashMap<>();
        ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS, true)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        try (InputStream is = LLMPricingConfig.class.getResourceAsStream(PRICING_FILE)) {
            if (is == null) {
                log.warning("llm-pricing.json not found on classpath — cost calculation will return 0");
            } else {
                TypeReference<Map<String, Map<String, ModelConfig>>> typeRef = new TypeReference<>() {};
                Map<String, Map<String, ModelConfig>> raw = mapper.readValue(is, typeRef);
                raw.forEach((provider, models) ->
                    models.forEach((model, config) -> {
                        if (!model.startsWith("_")) {   // skip _comment_* keys
                            loaded.put(provider + ":" + model, config.tiers());
                        }
                    }));
                log.info("Loaded pricing for " + loaded.size() + " models from " + PRICING_FILE);
            }
        } catch (Exception e) {
            log.severe("Failed to load " + PRICING_FILE + ": " + e);
        }

        PRICING = Collections.unmodifiableMap(loaded);
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    /**
     * Returns the effective pricing for {@code model} at the given {@code contextTokens} size.
     *
     * <p>Tier selection: iterates tiers in order (smallest threshold first) and returns the
     * first tier whose {@code max_context_tokens} is absent ({@code null}) or
     * {@code >= contextTokens}. Falls back to the last tier if all thresholds are exceeded.
     * {@code null} contextTokens → first (cheapest) tier.
     *
     * @param provider      LLM provider
     * @param model         model identifier as used in the pricing file
     * @param contextTokens prompt token count; {@code null} selects the first tier
     * @return effective pricing, or empty if the provider/model pair is not configured
     */
    public static Optional<ModelPricing> getPricing(LLMProvider provider, String model, Integer contextTokens) {
        if (provider == null || model == null) {
            return Optional.empty();
        }
        // provider.name() is an upper case and json is using lower case
        List<PricingTier> tiers = PRICING.get(provider.getValue() + ":" + model);
        if (tiers == null || tiers.isEmpty()) {
            return Optional.empty();
        }

        if (contextTokens == null) {
            return Optional.of(tiers.get(0).toModelPricing());
        }

        for (PricingTier tier : tiers) {
            // no differential pricing or belongs to this level's pricing
            if (tier.maxContextTokens() == null || contextTokens <= tier.maxContextTokens()) {
                return Optional.of(tier.toModelPricing());
            }
        }

        // contextTokens exceeds every tier's threshold — use the last (most expensive) tier
        return Optional.of(tiers.get(tiers.size() - 1).toModelPricing());
    }
}
