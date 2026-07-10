import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, percentageChange } from '../src/services/index.js';

test('builds overview token totals for lifetime and recent days', () => {
  const today = new Date('2026-07-09T12:00:00Z');
  const summary = buildSummary(2, [
    { start_time: '2026-07-09T01:00:00Z', usage: { prompt_tokens: 10, completion_tokens: 5 } },
    { start_time: '2026-07-08T01:00:00Z', usage: { total_tokens: 7 } },
    { start_time: '2026-07-07T01:00:00Z', usage: { prompt_tokens: 2, completion_tokens: 3 } },
    { start_time: '2026-07-01T01:00:00Z', usage: { total_tokens: 11 } },
  ], today);

  assert.deepEqual(summary, {
    projectCount: 2,
    lifetimeTotalTokens: 38,
    yesterdayTotalTokens: 7,
    todayTotalTokens: 15,
    todayVsYesterdayPercentage: 114.28571428571429,
    yesterdayVsDayBeforePercentage: 40,
  });
});

test('percentage change matches Java null-on-zero behavior', () => {
  assert.equal(percentageChange(0, 10), null);
  assert.equal(percentageChange(50, 75), 50);
});
