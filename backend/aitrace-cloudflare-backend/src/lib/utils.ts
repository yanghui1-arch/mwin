import type { JsonValue } from '../domain/types.js';

export function parseJson<T extends JsonValue>(value: unknown, fallback: T): T;
export function parseJson<T extends JsonValue>(value: unknown, fallback?: null): T | null;
export function parseJson<T extends JsonValue>(value: unknown, fallback: T | null = null): T | null {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function stringifyJson(value: JsonValue | undefined): string | null {
  return value == null ? null : JSON.stringify(value);
}

export function nowIso(): string { return new Date().toISOString(); }
export function newId(): string { return crypto.randomUUID(); }

export function extractApiKey(authorization: string | null): string {
  if (!authorization) throw new Error('Missing Authorization header');
  const value = authorization.trim();
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : value;
}

export function concealApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return apiKey;
  return `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function durationMillis(startTime: string, endTime: string): number {
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

export function pageCount(total: number, pageSize: number): number { return Math.ceil(total / pageSize); }
