import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDirectory = join(import.meta.dirname, '..', 'migrations');
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort();

test('D1 migrations remove inline payloads and discard rows without OSS pointers', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const file of migrationFiles.filter((name) => name < '0006')) {
    db.exec(readFileSync(join(migrationsDirectory, file), 'utf8'));
  }

  db.exec(`
    INSERT INTO users (id, username) VALUES ('user-1', 'tester');
    INSERT INTO project (id, user_uuid, name) VALUES (1, 'user-1', 'demo');
    INSERT INTO s3_compatible_object
      (object_key, content_type, content_encoding, schema_version, raw_size_bytes,
       stored_size_bytes, sha256, created_at, updated_at)
    VALUES
      ('payloads/v2/step/new-step.json.gz', 'application/gzip', 'gzip', 2, 1, 1,
       '0000000000000000000000000000000000000000000000000000000000000000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('payloads/v2/trace/new-trace.json.gz', 'application/gzip', 'gzip', 2, 1, 1,
       '0000000000000000000000000000000000000000000000000000000000000000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO trace
      (id, project_name, project_id, name, conversation_id, tags, input, output,
       start_time, last_update_timestamp, payload_object_key)
    VALUES
      ('old-trace', 'demo', 1, 'old', 'conversation', '[]', '{}', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
      ('new-trace', 'demo', 1, 'new', 'conversation', '[]', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
       'payloads/v2/trace/new-trace.json.gz');
    INSERT INTO step
      (id, name, type, tags, input, output, project_name, project_id, start_time,
       payload_object_key)
    VALUES
      ('old-step', 'old', 'general', '[]', '{}', '{}', 'demo', 1, CURRENT_TIMESTAMP, NULL),
      ('new-step', 'new', 'general', '[]', NULL, NULL, 'demo', 1, CURRENT_TIMESTAMP,
       'payloads/v2/step/new-step.json.gz');
    INSERT INTO step_meta (id, metadata) VALUES ('old-step', '{}'), ('new-step', '{}');
  `);

  db.exec(readFileSync(join(migrationsDirectory, '0006_remove_inline_payload_columns.sql'), 'utf8'));

  const tableInfo = (table: 'step' | 'trace') => db.prepare(`PRAGMA table_info(${table})`).all();
  const columns = (table: 'step' | 'trace') => tableInfo(table).map((row) => String(row.name));
  assert.equal(columns('step').includes('input'), false);
  assert.equal(columns('step').includes('output'), false);
  assert.equal(columns('trace').includes('input'), false);
  assert.equal(columns('trace').includes('output'), false);
  for (const table of ['step', 'trace'] as const) {
    const payloadColumn = tableInfo(table).find((row) => row.name === 'payload_object_key');
    assert.equal(payloadColumn?.notnull, 1);
  }
  const ids = (table: 'step' | 'trace' | 'step_meta') => db.prepare(`SELECT id FROM ${table} ORDER BY id`)
    .all().map((row) => String(row.id));
  assert.deepEqual(ids('step'), ['new-step']);
  assert.deepEqual(ids('trace'), ['new-trace']);
  assert.deepEqual(ids('step_meta'), ['new-step']);
  assert.throws(() => db.exec(`INSERT INTO step
    (id, name, type, tags, project_name, project_id, start_time, payload_object_key)
    VALUES ('missing-payload', 'invalid', 'general', '[]', 'demo', 1, CURRENT_TIMESTAMP, NULL)`),
  /NOT NULL constraint failed: step.payload_object_key/);
});
