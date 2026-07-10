import pricingJson from './llm-pricing.json' with { type: 'json' };

export interface PricingTier {
  max_context_tokens?: number;
  input_price_per_million: number;
  cached_input_price_per_million?: number;
  output_price_per_million: number;
  thinking_output_price_per_million?: number;
}

type PricingConfig = Record<string, Record<string, { tiers: PricingTier[] }>>;
const pricing = pricingJson as PricingConfig;

export const LLM_PROVIDERS = new Set([
  'open_router', 'dash_scope', 'kimi', 'openai', 'deepseek', 'glm',
  'anthropic', 'google', 'vllm', 'ollama', 'transformers',
]);

export function normalizeProvider(provider: string | null | undefined): string | null {
  if (!provider) return null;
  const value = provider.toLowerCase();
  return LLM_PROVIDERS.has(value) ? value : null;
}

export function resolvePricing(provider: string | null | undefined, model: string | null | undefined, contextTokens: number | null = null): PricingTier | null {
  const normalizedProvider = normalizeProvider(provider);
  if (!normalizedProvider || !model) return null;
  const tiers = pricing[normalizedProvider]?.[model]?.tiers;
  if (!tiers?.length) return null;
  if (contextTokens == null) return tiers[0];
  return tiers.find((tier) => tier.max_context_tokens == null || contextTokens <= tier.max_context_tokens) ?? tiers[tiers.length - 1];
}
