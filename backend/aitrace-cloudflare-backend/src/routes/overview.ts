import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { success } from '../lib/response.js';
import { toOverviewSummaryResponse, toOverviewTokenCurveResponse } from '../services/overview.js';

const overview = new Hono<AppEnv>();

overview.get('/summary', (c) => withUser(c.req.raw, c.env, async (userId) => {
  return success(toOverviewSummaryResponse(await c.var.services.getSummary(userId)));
}));
overview.get('/token-curve', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const windowHours = parseWindowHours(c.req.query('window_hours'));
  const projectIds = parseProjectIds(c.req.query('project_ids'));
  return success(toOverviewTokenCurveResponse(await c.var.services.getTokenCurve(userId, windowHours, projectIds)));
}));

function parseWindowHours(value: string | undefined): number {
  if (value == null || value === '') return 720;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error('window_hours must be an integer');
  return parsed;
}

function parseProjectIds(value: string | undefined): number[] {
  if (!value?.trim()) return [];
  return value.split(',').filter(Boolean).map((part) => {
    const projectId = Number(part.trim());
    if (!Number.isSafeInteger(projectId) || projectId < 1) throw new Error('project_ids must contain positive integers');
    return projectId;
  });
}

export default overview;
