import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { success } from '../lib/response.js';

const steps = new Hono<AppEnv>();

steps.get('/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const page = Number(c.req.query('page') ?? 0);
  const pageSize = Number(c.req.query('pageSize') ?? 15);
  return success(await c.var.services.getSteps(userId, c.req.param('projectName'), page, pageSize));
}));
steps.post('/delete', async (c) => {
  return success(await c.var.services.repositories.deleteSteps(await c.req.json<string[]>()));
});

export default steps;
