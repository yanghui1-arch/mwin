import { Hono } from 'hono';
import type { AppEnv } from './domain/types.js';
import { error, notFound } from './lib/response.js';
import { servicesMiddleware } from './middleware/services.js';
import apiKeys from './routes/api-keys.js';
import auth from './routes/auth.js';
import logs from './routes/logs.js';
import overview from './routes/overview.js';
import projects from './routes/projects.js';
import steps from './routes/steps.js';
import traces from './routes/traces.js';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', servicesMiddleware);
  app.route('/api/auth', auth);
  app.route('/api/apikey', apiKeys);
  app.route('/api/v0/project', projects);
  app.route('/api/v0/log', logs);
  app.route('/api/v0/trace', traces);
  app.route('/api/v0/step', steps);
  app.route('/api/v0/overview', overview);
  app.notFound(() => notFound('Not found'));
  app.onError((err) => error(err.message));

  return app;
}
