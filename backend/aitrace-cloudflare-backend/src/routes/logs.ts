import { Hono } from 'hono';
import type { AppEnv, LogRequest } from '../domain/types.js';
import { success } from '../lib/response.js';
import { requestJson, requireApiUser } from '../lib/route-helpers.js';

const logs = new Hono<AppEnv>();

logs.post('/trace', async (c) => {
  const userId = await requireApiUser(c.req.raw, c.var.services);
  return success(await c.var.services.logTrace(userId, await requestJson<LogRequest>(c.req.raw)));
});
logs.post('/step', async (c) => {
  const userId = await requireApiUser(c.req.raw, c.var.services);
  return success(await c.var.services.logStep(userId, await requestJson<LogRequest>(c.req.raw)));
});

export default logs;
