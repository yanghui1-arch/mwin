import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, percentageChange } from '../src/services/index.js';
import { OverviewService, toOverviewSummaryResponse, toOverviewTokenCurveResponse } from '../src/services/overview.js';

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

test('serializes overview data with the web client snake_case contract', () => {
  const summary = toOverviewSummaryResponse(buildSummary(2, [], new Date('2026-07-09T12:00:00Z')));
  assert.deepEqual(summary, {
    tracked_project_count: 2,
    lifetime_total_tokens: 0,
    yesterday_total_tokens: 0,
    today_total_tokens: 0,
    today_change_pct: null,
    yesterday_change_pct: null,
  });
});

test('builds a user-owned, zero-filled hourly token curve', async () => {
  const repositories = {
    async listProjects() {
      return [
        { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null, averageDuration: 0, cost: '0', createdTimestamp: '', lastUpdateTimestamp: '' },
        { id: 2, userId: 'user-1', name: 'other', description: null, strategy: null, averageDuration: 0, cost: '0', createdTimestamp: '', lastUpdateTimestamp: '' },
      ];
    },
    async tokenSnapshots() {
      return [
        { projectId: 1, startTime: '2026-07-09T01:15:00Z', usage: { total_tokens: 7 } },
        { projectId: 1, startTime: '2026-07-09T01:55:00Z', usage: { total_tokens: 3 } },
      ];
    },
  };
  const curve = await new OverviewService(repositories as never)
    .getTokenCurve('user-1', 24, [1, 999], new Date('2026-07-09T12:00:00Z'));
  const response = toOverviewTokenCurveResponse(curve);

  assert.equal(response.window_hours, 24);
  assert.equal(response.granularity, 'hour');
  assert.deepEqual(response.project_ids, [1]);
  assert.equal(response.series[0].project_name, 'demo');
  assert.equal(response.series[0].points.length, 24);
  assert.deepEqual(response.series[0].points[1], { bucket_start: '2026-07-09T01:00:00.000Z', tokens: 10 });
});
