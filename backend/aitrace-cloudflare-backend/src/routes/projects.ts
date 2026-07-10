import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { json, success } from '../lib/response.js';
import { requestJson } from '../lib/route-helpers.js';

const projects = new Hono<AppEnv>();

projects.get('/get_all_projects', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const result = await c.var.services.listProjects(userId);
  return result.length ? success(result) : json({ code: 404, message: 'Not found projects', data: null });
}));
projects.post('/create_new_project', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const project = await c.var.services.createProject(userId, await requestJson(c.req.raw));
  return success(project, `Create a new project successfully for user uuid: ${userId}`);
}));
projects.post('/delete/:projectName', (c) => withUser(c.req.raw, c.env, async (userId) => {
  return success(await c.var.services.deleteProject(userId, c.req.param('projectName')));
}));
projects.post('/update/:description', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const body = await requestJson<{ project_id?: number; projectId?: number }>(c.req.raw);
  const projectId = body.project_id ?? body.projectId;
  if (projectId == null) throw new Error('Missing project id');
  const project = await c.var.services.updateProject(userId, projectId, c.req.param('description'));
  return success(project, 'Update project description successfully');
}));

export default projects;
