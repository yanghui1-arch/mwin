import { withUser } from './auth.js';
import { json, notFound, success } from './response.js';
import { authenticate, requestJson } from './route-helpers.js';

export function authRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/auth/github/callback') return authenticate(request, env, svc);
  if (request.method === 'GET' && pathname === '/api/auth/me') return withUser(request, env, async (userId) => {
    const user = await svc.repositories.findUser(userId);
    return success({ userName: user.username, avatar: user.avatar, token: request.headers.get('AT-token') });
  });
  return null;
}

export function apiKeyRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/apikey/get') return withUser(request, env, async (userId) => {
    const key = await svc.getConcealedApiKey(userId);
    return key ? success(key) : notFound('Not found api key');
  });
  if (request.method === 'GET' && pathname === '/api/apikey/get_complete_apikey') return withUser(request, env, async (userId) => {
    const key = await svc.getCompleteApiKey(userId);
    return key ? success(key) : notFound('Not found api key');
  });
  if (request.method === 'POST' && pathname === '/api/apikey/change') return withUser(request, env, async (userId) => {
    return success(await svc.generateAndStoreApiKey(userId), 'Change another AITrace API key successfully.');
  });
  return null;
}

export function projectRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/v0/project/get_all_projects') return withUser(request, env, async (userId) => {
    const projects = await svc.listProjects(userId);
    return projects.length ? success(projects) : json({ code: 404, message: 'Not found projects', data: null });
  });
  if (request.method === 'POST' && pathname === '/api/v0/project/create_new_project') return withUser(request, env, async (userId) => {
    return success(await svc.createProject(userId, await requestJson(request)), `Create a new project successfully for user uuid: ${userId}`);
  });
  return null;
}
