import { add, decimal, divideIntegerHalfUp, multiplyInteger, toDecimalString, ZERO } from '../lib/decimal.js';
import { resolvePricing } from '../config/pricing.js';
import type { Usage } from '../domain/types.js';

function tokenCost(pricePerMillion: number | null | undefined, tokens: number | null | undefined) {
  if (!tokens || pricePerMillion == null) return ZERO;
  return divideIntegerHalfUp(multiplyInteger(pricePerMillion, tokens), 1_000_000);
}

/** Reads provider-normalized prompt tokens from a usage payload. */
export function getPromptTokens(usage: Usage | null | undefined): number | null {
  return usage?.prompt_tokens ?? null;
}
/** Reads completion tokens, including the Gemini-compatible fallback field. */
export function getCompletionTokens(usage: Usage | null | undefined): number | null {
  return usage?.completion_tokens ?? usage?.candidates_token_count ?? null;
}
/** Uses a reported total when present, otherwise sums prompt and completion tokens. */
export function getTotalTokens(usage: Usage | null | undefined): number {
  if (!usage) return 0;
  return usage.total_tokens ?? (getPromptTokens(usage) ?? 0) + (getCompletionTokens(usage) ?? 0);
}
/** Sums prompt and completion audio tokens, returning null when none were reported. */
export function getAudioTokens(usage: Usage | null | undefined): number | null {
  const total = (usage?.prompt_tokens_details?.audio_tokens ?? 0) + (usage?.completion_tokens_details?.audio_tokens ?? 0);
  return total > 0 ? total : null;
}

/** Returns provider-reported cost or computes a fixed-precision local pricing estimate. */
export function calcUsageCost(provider: string | null | undefined, model: string | null | undefined, usage: Usage | null | undefined): string {
  if (!usage) return toDecimalString(ZERO);
  if (usage.cost != null) return toDecimalString(decimal(usage.cost));
  const promptTokens = getPromptTokens(usage);
  const completionTokens = getCompletionTokens(usage);
  if (promptTokens == null || completionTokens == null) return toDecimalString(ZERO);
  const tier = resolvePricing(provider, model, promptTokens);
  if (!tier) return toDecimalString(ZERO);

  let cost = ZERO;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens;
  if (cachedTokens != null) {
    cost = add(cost, tokenCost(tier.cached_input_price_per_million ?? tier.input_price_per_million, cachedTokens));
    if (promptTokens > cachedTokens) cost = add(cost, tokenCost(tier.input_price_per_million, promptTokens - cachedTokens));
  } else cost = add(cost, tokenCost(tier.input_price_per_million, promptTokens));

  const outputPrice = (usage.completion_tokens_details?.reasoning_tokens ?? 0) > 0
    ? tier.thinking_output_price_per_million ?? tier.output_price_per_million
    : tier.output_price_per_million;
  return toDecimalString(add(cost, tokenCost(outputPrice, completionTokens)));
}

export { resolvePricing } from '../config/pricing.js';
