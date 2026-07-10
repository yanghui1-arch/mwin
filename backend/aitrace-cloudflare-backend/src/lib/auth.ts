import { error } from './response.js';
import type { Bindings, JsonObject } from '../domain/types.js';

function base64Url(bytes: ArrayBuffer | ArrayBufferView): string {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return btoa(String.fromCharCode(...view)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Signs a short-lived HS256 session token with issued-at and expiry claims. */
export async function signJwt(payload: JsonObject, secret: string, expiresInSeconds = 7 * 24 * 3600): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64Url(new TextEncoder().encode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds })));
  const data = `${header}.${body}`;
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(data));
  return `${data}.${base64Url(signature)}`;
}

/** Verifies an HS256 signature and rejects expired session tokens. */
export async function verifyJwt(token: string, secret: string): Promise<JsonObject> {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('Invalid token');
  const data = `${header}.${body}`;
  if (!await crypto.subtle.verify('HMAC', await hmacKey(secret), decodeBase64Url(signature), new TextEncoder().encode(data))) throw new Error('Invalid token');
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(body))) as JsonObject;
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired token');
  return payload;
}

/** Extracts and validates the dashboard token, returning its user identifier. */
export async function requireUserId(request: Request, env: Bindings): Promise<string> {
  const token = request.headers.get('AT-token') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing token');
  const userId = (await verifyJwt(token, env.JWT_SECRET)).userId;
  if (typeof userId !== 'string') throw new Error('Invalid token');
  return userId;
}

/** Runs an authenticated handler and converts authentication failures to API errors. */
export async function withUser(request: Request, env: Bindings, callback: (userId: string) => Promise<Response>): Promise<Response> {
  try { return await callback(await requireUserId(request, env)); }
  catch (err) { return error(err instanceof Error ? err.message : 'Authentication failed'); }
}
