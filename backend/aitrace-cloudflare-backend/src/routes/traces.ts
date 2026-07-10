import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { success } from '../lib/response.js';
import { requestJson } from '../lib/route-helpers.js';

const traces = new Hono<AppEnv>();

traces.get('/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const page = Number(c.req.query('page') ?? 0);
  const pageSize = Number(c.req.query('pageSize') ?? 10);
  return success(await c.var.services.getTraces(userId, c.req.param('projectName'), page, pageSize));
}));
traces.post('/get_tracks', async (c) => {
  const body = await requestJson<{ trace_id?: string; traceId?: string }>(c.req.raw);
  const traceId = body.trace_id ?? body.traceId;
  if (!traceId) throw new Error('Missing trace id');
  return success(await c.var.services.getTracks(traceId));
});
traces.post('/delete', async (c) => {
  return success(await c.var.services.repositories.deleteTraces(await c.req.json<string[]>()));
});

export default traces;
