import type { JsonValue } from '../domain/types.js';

/** Parses database JSON fields and returns the supplied fallback for invalid input. */
export function parseJson<T extends JsonValue>(value: unknown, fallback: T): T;
export function parseJson<T extends JsonValue>(value: unknown, fallback?: null): T | null;
export function parseJson<T extends JsonValue>(value: unknown, fallback: T | null = null): T | null {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

/** Serializes optional JSON values for nullable database columns. */
export function stringifyJson(value: JsonValue | undefined): string | null {
  return value == null ? null : JSON.stringify(value);
}

/** Returns the current timestamp in the database's ISO format. */
export function nowIso(): string { return new Date().toISOString(); }
/** Generates identifiers with the Worker Web Crypto API. */
export function newId(): string { return crypto.randomUUID(); }

/** Accepts either a raw API key or a Bearer authorization value. */
export function extractApiKey(authorization: string | null): string {
  if (!authorization) throw new Error('Missing Authorization header');
  const value = authorization.trim();
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : value;
}

/** Masks an API key while retaining enough characters for identification. */
export function concealApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return apiKey;
  return `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}

/** Computes a lowercase SHA-256 digest for API key generation. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Calculates elapsed milliseconds between two ISO timestamps. */
export function durationMillis(startTime: string, endTime: string): number {
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

/** Converts a result count into the number of fixed-size pages. */
export function pageCount(total: number, pageSize: number): number { return Math.ceil(total / pageSize); }
