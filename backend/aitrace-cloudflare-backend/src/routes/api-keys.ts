import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { notFound, success } from '../lib/response.js';

const apiKeys = new Hono<AppEnv>();

apiKeys.get('/get', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const key = await c.var.services.getConcealedApiKey(userId);
  return key ? success(key) : notFound('Not found api key');
}));
apiKeys.get('/get_complete_apikey', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const key = await c.var.services.getCompleteApiKey(userId);
  return key ? success(key) : notFound('Not found api key');
}));
apiKeys.post('/change', (c) => withUser(c.req.raw, c.env, async (userId) => {
  return success(await c.var.services.generateAndStoreApiKey(userId), 'Change another AITrace API key successfully.');
}));

export default apiKeys;
