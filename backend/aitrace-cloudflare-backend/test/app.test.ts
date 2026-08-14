import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('registers resource routers at the existing API paths', () => {
  const routes = createApp().routes
    .filter((route) => route.method !== 'ALL')
    .map((route) => `${route.method} ${route.path}`)
    .sort();

  assert.deepEqual(routes, [
    'GET /api/apikey/get',
    'GET /api/apikey/get_complete_apikey',
    'GET /api/auth/github/callback',
    'GET /api/auth/me',
    'GET /api/v0/media/:mediaId',
    'GET /api/v0/overview/summary',
    'GET /api/v0/overview/token-curve',
    'GET /api/v0/project/get_all_projects',
    'GET /api/v0/step/:projectName',
    'GET /api/v0/trace/:projectName',
    'POST /api/apikey/change',
    'POST /api/v0/log/step',
    'POST /api/v0/log/trace',
    'POST /api/v0/log/trace_tree',
    'POST /api/v0/media/upload',
    'POST /api/v0/project/create_new_project',
    'POST /api/v0/project/delete/:projectName',
    'POST /api/v0/project/update/:description',
    'POST /api/v0/step/delete',
    'POST /api/v0/trace/delete',
    'POST /api/v0/trace/get_tracks',
  ]);
});
