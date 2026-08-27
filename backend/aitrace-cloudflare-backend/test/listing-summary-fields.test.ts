import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/index.js';
import { listSteps } from '../src/repositories/step.js';
import { listTraces } from '../src/repositories/trace.js';
import { D1Shim, buildMigratedDatabase } from './helpers/d1-sqlite.js';

/**
 * Verifies that the step/trace list queries expose the payload size (joined
 * from s3_compatible_object) and the per-trace step count that the web
 * dashboard renders in the Size/Steps columns (#55).
 */
test('step and trace lists expose payload size and trace step counts', async () => {
  const sqlite = buildMigratedDatabase();
  const db = createDatabase(new D1Shim(sqlite) as unknown as D1Database);

  const now = '2026-07-10T00:00:00.000Z';
  const sha = '0'.repeat(64);
  const insertObject = sqlite.prepare(`INSERT INTO s3_compatible_object
    (object_key, content_type, content_encoding, schema_version, raw_size_bytes,
     stored_size_bytes, sha256, created_at, updated_at)
    VALUES (?, 'application/gzip', 'gzip', 2, ?, 1, ?, ?, ?)`);
  insertObject.run('payloads/v2/step/step-a.json.gz', 1234, sha, now, now);
  insertObject.run('payloads/v2/step/step-b.json.gz', 56, sha, now, now);
  insertObject.run('payloads/v2/trace/trace-1.json.gz', 2048, sha, now, now);

  sqlite.prepare(`INSERT INTO users (id, username) VALUES ('user-1', 'tester')`).run();
  sqlite.prepare(`INSERT INTO project (id, user_uuid, name) VALUES (1, 'user-1', 'demo')`).run();
  sqlite.prepare(`INSERT INTO trace
    (id, project_name, project_id, name, conversation_id, tags, payload_object_key,
     start_time, last_update_timestamp)
    VALUES ('trace-1', 'demo', 1, 'trace-one', 'conversation', '[]',
            'payloads/v2/trace/trace-1.json.gz', ?, ?)`).run(now, now);
  sqlite.prepare(`INSERT INTO step
    (id, name, trace_id, type, tags, payload_object_key, project_name, project_id,
     start_time, end_time)
    VALUES (?, 'step-a', 'trace-1', 'general', '[]', 'payloads/v2/step/step-a.json.gz',
            'demo', 1, ?, ?)`).run('step-a', now, now);
  sqlite.prepare(`INSERT INTO step
    (id, name, trace_id, type, tags, payload_object_key, project_name, project_id,
     start_time, end_time)
    VALUES (?, 'step-b', 'trace-1', 'general', '[]', 'payloads/v2/step/step-b.json.gz',
            'demo', 1, ?, ?)`).run('step-b', now, now);
  sqlite.prepare(`INSERT INTO step_meta (id, metadata, cost, cost_units)
    VALUES ('step-a', '{}', '0.0000000000', 0), ('step-b', '{}', '0.0000000000', 0)`).run();

  const steps = await listSteps(db, 1, 0, 10);
  assert.equal(steps.total, 2);
  assert.deepEqual(new Map(steps.data.map((row) => [row.id, row.payloadSize])),
    new Map([['step-a', 1234], ['step-b', 56]]));

  const traces = await listTraces(db, 1, 0, 10);
  assert.equal(traces.total, 1);
  assert.equal(traces.data[0].payloadSize, 2048);
  assert.equal(traces.data[0].stepCount, 2);
});
