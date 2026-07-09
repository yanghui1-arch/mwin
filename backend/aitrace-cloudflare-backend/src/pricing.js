import { add, decimal, divideIntegerHalfUp, multiplyInteger, toDecimalString, ZERO } from './decimal.js';
import { resolvePricing } from './pricing-config.js';

function tokenCost(pricePerMillion, tokens) {
  if (tokens == null || tokens === 0 || pricePerMillion == null) return ZERO;
  return divideIntegerHalfUp(multiplyInteger(pricePerMillion, tokens), 1_000_000);
}

export function getPromptTokens(usage) {
  return usage?.prompt_tokens ?? null;
}

export function getCompletionTokens(usage) {
  return usage?.completion_tokens ?? usage?.candidates_token_count ?? null;
}

export function getTotalTokens(usage) {
  if (!usage) return 0;
  if (usage.total_tokens != null) return usage.total_tokens;
  return (getPromptTokens(usage) ?? 0) + (getCompletionTokens(usage) ?? 0);
}

export function getAudioTokens(usage) {
  const promptAudio = usage?.prompt_tokens_details?.audio_tokens ?? 0;
  const completionAudio = usage?.completion_tokens_details?.audio_tokens ?? 0;
  const total = promptAudio + completionAudio;
  return total > 0 ? total : null;
}

export function calcUsageCost(provider, model, usage) {
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
    const cachedPrice = tier.cached_input_price_per_million ?? tier.input_price_per_million;
    cost = add(cost, tokenCost(cachedPrice, cachedTokens));
    if (promptTokens - cachedTokens > 0) cost = add(cost, tokenCost(tier.input_price_per_million, promptTokens - cachedTokens));
  } else {
    cost = add(cost, tokenCost(tier.input_price_per_million, promptTokens));
  }

  const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? 0;
  const outputPrice = reasoningTokens > 0
    ? (tier.thinking_output_price_per_million ?? tier.output_price_per_million)
    : tier.output_price_per_million;
  return toDecimalString(add(cost, tokenCost(outputPrice, completionTokens)));
}

export { resolvePricing } from './pricing-config.js';
