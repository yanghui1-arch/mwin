import { Hono } from 'hono';
import type { AppEnv, LogRequest, LogTraceTreeRequest } from '../domain/types.js';
import { success } from '../lib/response.js';
import { requestJson, requireApiUser } from '../lib/route-helpers.js';

const logs = new Hono<AppEnv>();

logs.post('/trace', async (c) => {
  const userId = await requireApiUser(c.req.raw, c.var.services);
  return success(await c.var.services.logTrace(
    userId,
    await requestJson<LogRequest>(c.req.raw, Number(c.env.TELEMETRY_MAX_REQUEST_SIZE_BYTES)),
  ));
});
logs.post('/step', async (c) => {
  const userId = await requireApiUser(c.req.raw, c.var.services);
  return success(await c.var.services.logStep(
    userId,
    await requestJson<LogRequest>(c.req.raw, Number(c.env.TELEMETRY_MAX_REQUEST_SIZE_BYTES)),
  ));
});
logs.post('/trace_tree', async (c) => {
  const userId = await requireApiUser(c.req.raw, c.var.services);
  return success(await c.var.services.logTraceTree(
    userId,
    await requestJson<LogTraceTreeRequest>(
      c.req.raw,
      Number(c.env.TELEMETRY_MAX_REQUEST_SIZE_BYTES),
    ),
  ));
});

export default logs;
