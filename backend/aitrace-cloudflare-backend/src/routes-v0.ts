import type { Hono } from 'hono';
import type { AppEnv, LogRequest } from './types.js';
import { withUser } from './auth.js';
import { success } from './response.js';
import { requireApiUser, requestJson } from './route-helpers.js';

export function registerV0Routes(app: Hono<AppEnv>) {
  app.post('/api/v0/log/trace', async (c) => {
    const svc = c.get('services');
    return success(await svc.logTrace(await requireApiUser(c.req.raw, svc), await requestJson<LogRequest>(c.req.raw)));
  });
  app.post('/api/v0/log/step', async (c) => {
    const svc = c.get('services');
    return success(await svc.logStep(await requireApiUser(c.req.raw, svc), await requestJson<LogRequest>(c.req.raw)));
  });

  app.get('/api/v0/trace/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const page = Number(c.req.query('page') ?? 0);
    const pageSize = Number(c.req.query('pageSize') ?? 10);
    return success(await c.get('services').getTraces(userId, c.req.param('projectName'), page, pageSize));
  }));
  app.get('/api/v0/step/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const page = Number(c.req.query('page') ?? 0);
    const pageSize = Number(c.req.query('pageSize') ?? 15);
    return success(await c.get('services').getSteps(userId, c.req.param('projectName'), page, pageSize));
  }));

  app.post('/api/v0/trace/get_tracks', async (c) => {
    const body = await requestJson<{ trace_id?: string; traceId?: string }>(c.req.raw);
    const traceId = body.trace_id ?? body.traceId;
    if (!traceId) throw new Error('Missing trace id');
    return success(await c.get('services').getTracks(traceId));
  });
  app.post('/api/v0/step/delete', async (c) => {
    return success(await c.get('services').repositories.deleteSteps(await c.req.json<string[]>()));
  });
  app.post('/api/v0/trace/delete', async (c) => {
    return success(await c.get('services').repositories.deleteTraces(await c.req.json<string[]>()));
  });

  app.get('/api/v0/overview/summary', (c) => withUser(c.req.raw, c.env, async (userId) => {
    return success(await c.get('services').getSummary(userId));
  }));
}
