import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { error, notFound } from '../src/lib/response.js';
import { requestJson } from '../src/lib/route-helpers.js';

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
    'GET /api/v0/step/:stepId/payload',
    'GET /api/v0/trace/:projectName',
    'GET /api/v0/trace/:traceId/payload',
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

test('API error envelopes use matching non-success HTTP statuses', async () => {
  const serverError = error('failed');
  const missing = notFound('missing');
  const serverErrorBody = await serverError.json() as { code: number };
  const missingBody = await missing.json() as { code: number };

  assert.equal(serverError.status, 500);
  assert.equal(serverErrorBody.code, 500);
  assert.equal(missing.status, 404);
  assert.equal(missingBody.code, 404);
});

test('telemetry JSON parsing rejects bodies above the configured limit', async () => {
  const request = new Request('https://example.test/api/v0/log/step', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ payload: 'x'.repeat(64) }),
  });

  await assert.rejects(requestJson(request, 32), /exceeds the configured limit of 32 bytes/);
});
