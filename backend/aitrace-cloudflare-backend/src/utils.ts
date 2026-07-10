export function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function stringifyJson(value) {
  return value == null ? null : JSON.stringify(value);
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID();
}

export function extractApiKey(authorization) {
  if (!authorization) throw new Error('Missing Authorization header');
  const value = authorization.trim();
  if (value.toLowerCase().startsWith('bearer ')) return value.slice(7).trim();
  return value;
}

export function concealApiKey(apiKey) {
  if (!apiKey || apiKey.length <= 8) return apiKey;
  return `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function durationMillis(startTime, endTime) {
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

export function pageCount(total, pageSize) {
  return Math.ceil(total / pageSize);
}
