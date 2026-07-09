import { Repositories } from './repositories.js';
import { Services } from './services.js';
import { error, notFound } from './response.js';
import { apiKeyRoutes, authRoutes, projectRoutes } from './routes.js';
import { logRoutes, mutationRoutes, overviewRoutes, projectMutationRoutes, queryRoutes } from './routes-v0.js';

function services(env) {
  return new Services(new Repositories(env.DB));
}

async function firstRoute(...routes) {
  for (const route of routes) {
    const response = await route;
    if (response) return response;
  }
  return null;
}

async function route(request, env) {
  const svc = services(env);
  const url = new URL(request.url);
  const { pathname } = url;
  const response = await firstRoute(
    authRoutes(request, env, svc, pathname),
    apiKeyRoutes(request, env, svc, pathname),
    projectRoutes(request, env, svc, pathname),
    projectMutationRoutes(request, env, svc, pathname),
    logRoutes(request, svc, pathname),
    queryRoutes(request, env, svc, url, pathname),
    mutationRoutes(request, svc, pathname),
    overviewRoutes(request, env, svc, pathname),
  );
  return response ?? notFound('Not found');
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (err) {
      return error(err.message);
    }
  },
};

export { route };
