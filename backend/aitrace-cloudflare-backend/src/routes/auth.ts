import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { notFound, success } from '../lib/response.js';
import { authenticate } from '../lib/route-helpers.js';

const auth = new Hono<AppEnv>();

auth.get('/github/callback', (c) => authenticate(c.req.raw, c.env, c.var.services));
auth.get('/me', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const user = await c.var.services.repositories.findUser(userId);
  if (!user) return notFound('User not found');
  return success({ userName: user.username, avatar: user.avatar, token: c.req.header('AT-token') });
}));

export default auth;
