import { Hono } from 'hono';
import type { AppEnv } from './types.js';
import { Repositories } from './repositories.js';
import { Services } from './services.js';
import { error, notFound } from './response.js';
import { registerDashboardRoutes } from './routes.js';
import { registerV0Routes } from './routes-v0.js';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('services', new Services(new Repositories(c.env.DB)));
    await next();
  });

  registerDashboardRoutes(app);
  registerV0Routes(app);
  app.notFound(() => notFound('Not found'));
  app.onError((err) => error(err.message));
  return app;
}

const app = createApp();
export default app;
