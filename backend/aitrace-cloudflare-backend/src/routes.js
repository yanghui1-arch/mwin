import { withUser } from './auth.js';
import { json, notFound, success } from './response.js';
import { authenticate, requestJson } from './route-helpers.js';

export function registerDashboardRoutes(app) {
  app.get('/api/auth/github/callback', (c) => authenticate(c.req.raw, c.env, c.get('services')));
  app.get('/api/auth/me', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const user = await c.get('services').repositories.findUser(userId);
    return success({ userName: user.username, avatar: user.avatar, token: c.req.header('AT-token') });
  }));

  app.get('/api/apikey/get', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const key = await c.get('services').getConcealedApiKey(userId);
    return key ? success(key) : notFound('Not found api key');
  }));
  app.get('/api/apikey/get_complete_apikey', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const key = await c.get('services').getCompleteApiKey(userId);
    return key ? success(key) : notFound('Not found api key');
  }));
  app.post('/api/apikey/change', (c) => withUser(c.req.raw, c.env, async (userId) => {
    return success(await c.get('services').generateAndStoreApiKey(userId), 'Change another AITrace API key successfully.');
  }));

  app.get('/api/v0/project/get_all_projects', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const projects = await c.get('services').listProjects(userId);
    return projects.length ? success(projects) : json({ code: 404, message: 'Not found projects', data: null });
  }));
  app.post('/api/v0/project/create_new_project', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const project = await c.get('services').createProject(userId, await requestJson(c.req.raw));
    return success(project, `Create a new project successfully for user uuid: ${userId}`);
  }));
  app.post('/api/v0/project/delete/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
    return success(await c.get('services').deleteProject(userId, c.req.param('projectName')));
  }));
  app.post('/api/v0/project/update/:description', (c) => withUser(c.req.raw, c.env, async (userId) => {
    const body = await requestJson(c.req.raw);
    const project = await c.get('services').updateProject(userId, body.project_id ?? body.projectId, c.req.param('description'));
    return success(project, 'Update project description successfully');
  }));
}
