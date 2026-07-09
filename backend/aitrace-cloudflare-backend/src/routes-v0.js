import { withUser } from './auth.js';
import { success } from './response.js';
import { requireApiUser, requestJson } from './routes.js';

export function projectMutationRoutes(request, env, svc, pathname) {
  if (request.method === 'POST' && pathname.startsWith('/api/v0/project/delete/')) return withUser(request, env, async (userId) => {
    return success(await svc.deleteProject(userId, decodeURIComponent(pathname.split('/').pop())));
  });
  if (request.method === 'POST' && pathname.startsWith('/api/v0/project/update/')) return withUser(request, env, async (userId) => {
    const body = await requestJson(request);
    const description = decodeURIComponent(pathname.split('/').pop());
    return success(await svc.updateProject(userId, body.project_id ?? body.projectId, description), 'Update project description successfully');
  });
  return null;
}

export async function logRoutes(request, svc, pathname) {
  if (request.method === 'POST' && pathname === '/api/v0/log/trace') {
    return success(await svc.logTrace(await requireApiUser(request, svc), await requestJson(request)));
  }
  if (request.method === 'POST' && pathname === '/api/v0/log/step') {
    return success(await svc.logStep(await requireApiUser(request, svc), await requestJson(request)));
  }
  return null;
}

export function queryRoutes(request, env, svc, url, pathname) {
  if (request.method === 'GET' && pathname.startsWith('/api/v0/trace/')) return withUser(request, env, async (userId) => {
    return success(await svc.getTraces(userId, decodeURIComponent(pathname.split('/').pop()), Number(url.searchParams.get('page') ?? 0), Number(url.searchParams.get('pageSize') ?? 10)));
  });
  if (request.method === 'GET' && pathname.startsWith('/api/v0/step/')) return withUser(request, env, async (userId) => {
    return success(await svc.getSteps(userId, decodeURIComponent(pathname.split('/').pop()), Number(url.searchParams.get('page') ?? 0), Number(url.searchParams.get('pageSize') ?? 15)));
  });
  return null;
}

export async function mutationRoutes(request, svc, pathname) {
  if (request.method === 'POST' && pathname === '/api/v0/trace/get_tracks') {
    const body = await requestJson(request);
    return success(await svc.getTracks(body.trace_id ?? body.traceId));
  }
  if (request.method === 'POST' && pathname === '/api/v0/step/delete') return success(await svc.repositories.deleteSteps(await requestJson(request)));
  if (request.method === 'POST' && pathname === '/api/v0/trace/delete') return success(await svc.repositories.deleteTraces(await requestJson(request)));
  return null;
}

export function overviewRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/v0/overview/summary') {
    return withUser(request, env, async (userId) => success(await svc.getSummary(userId)));
  }
  return null;
}
