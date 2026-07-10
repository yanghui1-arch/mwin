import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../domain/types.js';
import { Repositories } from '../repositories/index.js';
import { Services } from '../services/index.js';

export const servicesMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('services', new Services(new Repositories(c.env.DB)));
  await next();
});
