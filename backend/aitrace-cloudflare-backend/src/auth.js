import { error } from './response.js';

function base64Url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signJwt(payload, secret, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encodedHeader = base64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedBody = base64Url(new TextEncoder().encode(JSON.stringify(body)));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(data));
  return `${data}.${base64Url(signature)}`;
}

export async function verifyJwt(token, secret) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('Invalid token');
  const data = `${header}.${body}`;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), decodeBase64Url(signature), new TextEncoder().encode(data));
  if (!valid) throw new Error('Invalid token');
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(body)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired token');
  return payload;
}

export async function requireUserId(request, env) {
  const token = request.headers.get('AT-token') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing token');
  const payload = await verifyJwt(token, env.JWT_SECRET);
  return payload.userId;
}

export async function withUser(request, env, callback) {
  try {
    return await callback(await requireUserId(request, env));
  } catch (err) {
    return error(err.message);
  }
}
