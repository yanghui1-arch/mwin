import test from 'node:test';
import assert from 'node:assert/strict';
import { calcUsageCost, getTotalTokens, resolvePricing } from '../src/services/pricing.js';

test('resolves tier by prompt token context', () => {
  assert.equal(resolvePricing('openai', 'gpt-5.5', 272000)?.input_price_per_million, 0.03857);
  assert.equal(resolvePricing('openai', 'gpt-5.5', 272001)?.input_price_per_million, 0.07714);
});

test('calculates cached prompt and completion cost with ten decimal places', () => {
  const cost = calcUsageCost('openai', 'gpt-5.5', {
    prompt_tokens: 1000,
    completion_tokens: 2000,
    prompt_tokens_details: { cached_tokens: 250 },
  });
  assert.equal(cost, '0.0004927478');
});

test('uses provider-reported usage cost before local pricing', () => {
  assert.equal(calcUsageCost('open_router', 'x-ai/grok-4.1-fast', { cost: '0.12345678901' }), '0.1234567890');
});

test('falls back to candidates token count for Gemini-style usage totals', () => {
  assert.equal(getTotalTokens({ prompt_tokens: 3, candidates_token_count: 5 }), 8);
});
