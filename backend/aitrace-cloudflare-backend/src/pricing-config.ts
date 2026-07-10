import pricing from './llm-pricing.json' assert { type: 'json' };

export const LLM_PROVIDERS = new Set([
  'open_router',
  'dash_scope',
  'kimi',
  'openai',
  'deepseek',
  'glm',
  'anthropic',
  'google',
  'vllm',
  'ollama',
  'transformers',
]);

export function normalizeProvider(provider) {
  if (!provider) return null;
  const value = String(provider).toLowerCase();
  return LLM_PROVIDERS.has(value) ? value : null;
}

export function resolvePricing(provider, model, contextTokens = null) {
  const normalizedProvider = normalizeProvider(provider);
  if (!normalizedProvider || !model) return null;

  const tiers = pricing[normalizedProvider]?.[model]?.tiers;
  if (!tiers?.length) return null;
  if (contextTokens == null) return tiers[0];

  return tiers.find((tier) => tier.max_context_tokens == null || contextTokens <= tier.max_context_tokens)
    ?? tiers[tiers.length - 1];
}
