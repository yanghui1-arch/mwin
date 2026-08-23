import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { success } from '../lib/response.js';
import { requestIdList, requestJson } from '../lib/route-helpers.js';

const traces = new Hono<AppEnv>();

traces.get('/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const page = Number(c.req.query('page') ?? 0);
  const pageSize = Number(c.req.query('pageSize') ?? 10);
  return success(await c.var.services.getTraces(userId, c.req.param('projectName'), page, pageSize));
}));
traces.get('/:traceId/payload', (c) => withUser(c.req.raw, c.env, async (userId) => {
  return success(await c.var.services.getTracePayload(userId, c.req.param('traceId')));
}));
traces.post('/get_tracks', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const body = await requestJson<{ trace_id?: string; traceId?: string }>(c.req.raw);
  const traceId = body.trace_id ?? body.traceId;
  if (!traceId) throw new Error('Missing trace id');
  const tracks = await c.var.services.getTracks(userId, traceId);
  return success(tracks.map((step) => ({
    ...step,
    parent_step_id: step.parentStepId,
    error_info: step.errorInfo,
    start_time: step.startTime,
    end_time: step.endTime,
    cost: Number(step.cost ?? 0),
  })));
}));
traces.post('/delete', (c) => withUser(c.req.raw, c.env, async (userId) => {
  return success(await c.var.services.repositories.deleteTracesForUser(userId, await requestIdList(c.req.raw)));
}));

export default traces;
