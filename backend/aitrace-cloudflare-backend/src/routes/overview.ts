import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { success } from '../lib/response.js';

const overview = new Hono<AppEnv>();

overview.get('/summary', (c) => withUser(c.req.raw, c.env, async (userId) => {
  return success(await c.var.services.getSummary(userId));
}));

export default overview;
