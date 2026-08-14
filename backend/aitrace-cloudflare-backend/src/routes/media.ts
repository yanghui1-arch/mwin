import { Hono } from 'hono';
import type { AppEnv } from '../domain/types.js';
import { withUser } from '../lib/auth.js';
import { success } from '../lib/response.js';
import { requireApiUser } from '../lib/route-helpers.js';

const media = new Hono<AppEnv>();

/** Accepts SDK multipart image uploads authenticated with an AITrace API key. */
media.post('/upload', async (c) => {
  const userId = await requireApiUser(c.req.raw, c.var.services);
  const formData = await c.req.raw.formData();
  const projectName = formData.get('project_name');
  const file: unknown = formData.get('file');
  if (typeof projectName !== 'string' || !projectName) throw new Error('project_name is required');
  if (!isUploadedFile(file)) throw new Error('Image file is required');
  const asset = await c.var.services.storeImage(userId, projectName, file);
  return success({ url: `/api/v0/media/${asset.id}` });
});

/** Streams a private image only to the dashboard user that owns it. */
media.get('/:mediaId', (c) => withUser(c.req.raw, c.env, async (userId) => {
  const result = await c.var.services.loadImage(userId, c.req.param('mediaId'));
  if (!result) return new Response(null, { status: 404 });
  const headers = new Headers({
    'content-type': result.asset.mimeType,
    'content-length': String(result.asset.sizeBytes),
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'etag': result.object.httpEtag,
  });
  return new Response(result.object.body, { headers });
}));

export default media;

function isUploadedFile(value: unknown): value is File {
  return typeof value === 'object' && value !== null
    && 'size' in value && typeof value.size === 'number'
    && 'type' in value && typeof value.type === 'string'
    && 'arrayBuffer' in value && typeof value.arrayBuffer === 'function';
}
