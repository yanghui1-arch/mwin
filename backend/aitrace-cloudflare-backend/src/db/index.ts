import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

/** Creates a request-scoped, schema-aware Drizzle database over the D1 binding. */
export function createDatabase(binding: D1Database) {
  return drizzle(binding, { schema });
}

export type AppDatabase = ReturnType<typeof createDatabase>;
