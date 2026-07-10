import { defineConfig } from 'drizzle-kit';

/**
 * Existing Wrangler migrations remain the production migration history.
 * Use this config to generate and validate future D1 schema changes.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
