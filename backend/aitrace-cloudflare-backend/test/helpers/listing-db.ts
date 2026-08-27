import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Minimal D1Database shim over node:sqlite so Drizzle's D1 driver runs locally. */
export class D1Shim {
  constructor(private readonly db: DatabaseSync) {}
  prepare(sql: string) {
    const statement = this.db.prepare(sql);
    const bound = (params: unknown[]) => {
      const runParams = params as Array<string | number | null>;
      return {
        all: async () => ({ results: statement.all(...runParams) }),
        first: async () => statement.get(...runParams),
        raw: async () => statement.all(...runParams).map((row) => Object.values(row)),
        run: async () => {
          const result = statement.run(...runParams);
          return { changes: Number(result.changes), meta: { changes: Number(result.changes) } };
        },
      };
    };
    return { bind: (...params: unknown[]) => bound(params) };
  }
  async batch(statements: { run: () => Promise<unknown> }[]) {
    return Promise.all(statements.map((s) => s.run()));
  }
}

/** Builds an in-memory D1 database by replaying the production migration files. */
export function buildDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const migrationsDirectory = join(import.meta.dirname, '..', '..', 'migrations');
  const migrationFiles = readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql')).sort();
  for (const file of migrationFiles) db.exec(readFileSync(join(migrationsDirectory, file), 'utf8'));
  return db;
}

/** Seeds one project with steps and traces that reference distinct payload objects. */
export function seedData(db: DatabaseSync) {
  db.exec(`
    INSERT INTO users (id, username) VALUES ('user-1', 'tester');
    INSERT INTO project (id, user_uuid, name) VALUES (1, 'user-1', 'demo');
  `);
  const insertObject = db.prepare(`INSERT INTO s3_compatible_object
    (object_key, content_type, content_encoding, schema_version, raw_size_bytes,
     stored_size_bytes, sha256, created_at, updated_at)
    VALUES (?, 'application/gzip', 'gzip', 2, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  insertObject.run('payloads/v2/step/step-a.json.gz', 1234, 100, 'a'.repeat(64));
  insertObject.run('payloads/v2/step/step-b.json.gz', 56, 40, 'b'.repeat(64));
  insertObject.run('payloads/v2/step/step-orphan.json.gz', 77, 60, 'c'.repeat(64));
  insertObject.run('payloads/v2/trace/trace-1.json.gz', 2048, 300, 'd'.repeat(64));
  insertObject.run('payloads/v2/trace/trace-2.json.gz', 1, 1, 'e'.repeat(64));

  const now = '2026-07-10T00:00:00.000Z';
  const insertTrace = db.prepare(`INSERT INTO trace
    (id, project_name, project_id, name, conversation_id, tags, payload_object_key,
     start_time, last_update_timestamp)
    VALUES (?, 'demo', 1, ?, 'conversation', '[]', ?, ?, ?)`);
  insertTrace.run('trace-1', 'trace-one', 'payloads/v2/trace/trace-1.json.gz', now, now);
  insertTrace.run('trace-2', 'trace-two', 'payloads/v2/trace/trace-2.json.gz', now, now);
  // A dangling payload_object_key (object deleted after the fact) exercises the
  // LEFT JOIN: the row must still be returned with a null payload size.
  db.exec('PRAGMA foreign_keys = OFF');
  insertTrace.run('trace-3', 'trace-orphan', 'payloads/v2/missing.json.gz', now, now);
  db.exec('PRAGMA foreign_keys = ON');

  const insertStep = db.prepare(`INSERT INTO step
    (id, name, trace_id, type, tags, payload_object_key, project_name, project_id,
     start_time, end_time)
    VALUES (?, ?, ?, 'general', '[]', ?, 'demo', 1, ?, ?)`);
  insertStep.run('step-a', 'step-a', 'trace-1', 'payloads/v2/step/step-a.json.gz', now, now);
  insertStep.run('step-b', 'step-b', 'trace-1', 'payloads/v2/step/step-b.json.gz', now, now);
  insertStep.run('step-orphan', 'step-orphan', 'trace-2', 'payloads/v2/step/step-orphan.json.gz', now, now);

  db.exec(`INSERT INTO step_meta (id, metadata, cost, cost_units) VALUES
    ('step-a', '{}', '0.0000000000', 0),
    ('step-b', '{}', '0.0000000000', 0),
    ('step-orphan', '{}', '0.0000000000', 0)`);
}
