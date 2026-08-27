import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../src/db/index.js';
import { rotateApiKey } from '../src/repositories/user.js';
import { upsertTraceForUser } from '../src/repositories/trace.js';
import { upsertStepForUser } from '../src/repositories/step.js';
import { upsertBatchForUser } from '../src/repositories/batch.js';

interface RecordedStatement { sql: string; values: unknown[] }

const payloadObject = (kind: 'step' | 'trace', id: string) => ({
  objectKey: `payloads/v2/${kind}/${id}.json.gz`, contentType: 'application/gzip', contentEncoding: 'gzip' as const,
  schemaVersion: 2, rawSizeBytes: 1, storedSizeBytes: 1, sha256: '0'.repeat(64), createdAt: '', updatedAt: '',
});

class RecordingDb {
  readonly batches: RecordedStatement[][] = [];

  prepare(sql: string) {
    return { bind: (...values: unknown[]): RecordedStatement => ({ sql, values }) };
  }

  async batch(statements: RecordedStatement[]) {
    this.batches.push(statements);
    return statements.map(() => ({ meta: { changes: 1 }, results: [] }));
  }
}

class SqliteBatchDb extends RecordingDb {
  constructor(private readonly db: DatabaseSync) {
    super();
  }

  override async batch(statements: RecordedStatement[]) {
    this.batches.push(statements);
    this.db.exec('BEGIN');
    try {
      const results = statements.map((statement) => {
        const result = this.db.prepare(statement.sql)
          .run(...statement.values as Array<string | number | null>);
        return { meta: { changes: Number(result.changes) }, results: [] };
      });
      this.db.exec('COMMIT');
      return results;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

test('key rotation is issued as one two-statement D1 transaction', async () => {
  const rawDb = new RecordingDb();
  await rotateApiKey(createDatabase(rawDb as unknown as D1Database), {
    id: 'key-1', userId: 'user-1', key: 'at-new', createdTime: '2026-07-10T00:00:00Z',
  });

  assert.equal(rawDb.batches.length, 1);
  assert.equal(rawDb.batches[0].length, 2);
  assert.match(rawDb.batches[0][0].sql, /^delete from "api_key"/i);
  assert.match(rawDb.batches[0][1].sql, /^insert into "api_key"/i);
});

test('trace and step telemetry mutations keep dependent writes in one batch', async () => {
  const db = new RecordingDb();
  await upsertTraceForUser(db as unknown as D1Database, 'user-1', {
    id: 'trace-1', parentTraceId: null, projectName: 'demo', projectId: 1, name: 'trace', conversationId: 'conversation',
    tags: [], errorInfo: null, startTime: '2026-07-10T00:00:00Z',
    lastUpdateTimestamp: '2026-07-10T00:00:01Z', payloadObjectKey: 'payloads/v2/trace/trace-1.json.gz',
  }, payloadObject('trace', 'trace-1'));
  await upsertStepForUser(db as unknown as D1Database, 'user-1', {
    id: 'step-1', name: 'step', traceId: 'trace-1', parentStepId: null, type: 'llm', tags: [],
    errorInfo: null, model: 'gpt-5.5', usage: null, projectName: 'demo',
    projectId: 1, startTime: '2026-07-10T00:00:00Z', endTime: '2026-07-10T00:00:01Z', payloadObjectKey: 'payloads/v2/step/step-1.json.gz',
  }, payloadObject('step', 'step-1'), { description: null }, '0.0002699980');

  assert.equal(db.batches.length, 2);
  assert.equal(db.batches[0].length, 3);
  assert.equal(db.batches[1].length, 4);
  assert.match(db.batches[1][2].sql, /^UPDATE project SET/);
  assert.match(db.batches[1][3].sql, /^INSERT INTO step_meta/);
});

test('trace-tree batch writes preserve trace order and rebuild aggregates once', async () => {
  const db = new RecordingDb();
  const traceBase = {
    projectName: 'demo', projectId: 1, name: 'trace', conversationId: 'conversation',
    tags: [], errorInfo: null, startTime: '2026-07-10T00:00:00Z',
    lastUpdateTimestamp: '2026-07-10T00:00:01Z',
  };
  await upsertBatchForUser(
    db as unknown as D1Database,
    'user-1',
    [
      { trace: { ...traceBase, id: 'parent', parentTraceId: null, payloadObjectKey: 'payloads/v2/trace/parent.json.gz' }, payloadObject: payloadObject('trace', 'parent') },
      { trace: { ...traceBase, id: 'child', parentTraceId: 'parent', payloadObjectKey: 'payloads/v2/trace/child.json.gz' }, payloadObject: payloadObject('trace', 'child') },
    ],
    [{
      step: {
        id: 'step-1', name: 'step', traceId: 'child', parentStepId: null, type: 'llm', tags: [],
        errorInfo: null, model: 'gpt-5.5', usage: null,
        projectName: 'demo', projectId: 1, startTime: '2026-07-10T00:00:00Z',
        endTime: '2026-07-10T00:00:01Z', payloadObjectKey: 'payloads/v2/step/step-1.json.gz',
      },
      payloadObject: payloadObject('step', 'step-1'),
      metadata: { description: null },
      cost: '0.0000000000',
    }],
    [1],
  );

  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 5);
  assert.equal(db.batches[0][1].values[0], 'parent');
  assert.equal(db.batches[0][1].values[12], 'child');
  assert.ok(db.batches[0].every((statement) => statement.values.length <= 100));
  assert.equal(db.batches[0].filter((statement) => /^UPDATE project SET/.test(statement.sql)).length, 1);
});

test('trace-tree batch keeps 128 steps within bounded multi-row statements', async () => {
  const db = new RecordingDb();
  const chunkObjects = Array.from({ length: 8 }, (_, index) => ({
    ...payloadObject('step', `chunk-${index}`),
    objectKey: `payloads/v3/step-chunk/step-${index * 16}.json.gz`,
    schemaVersion: 3,
  }));
  const steps = Array.from({ length: 128 }, (_, index) => {
    const id = `step-${index}`;
    const chunkObject = chunkObjects[Math.floor(index / 16)];
    return {
      step: {
        id, name: id, traceId: null, parentStepId: null, type: 'general', tags: [],
        errorInfo: null, model: null, usage: null, projectName: 'demo', projectId: 1,
        startTime: '2026-07-10T00:00:00Z', endTime: '2026-07-10T00:00:01Z',
        payloadObjectKey: chunkObject.objectKey,
      },
      payloadObject: chunkObject,
      metadata: { description: null },
      cost: '0.0000000000',
    };
  });

  await upsertBatchForUser(
    db as unknown as D1Database,
    'user-1',
    [],
    steps,
    [1],
  );

  assert.equal(db.batches.length, 1);
  assert.ok(db.batches[0].length < 50);
  assert.ok(db.batches[0].every((statement) => statement.values.length <= 100));
  assert.equal(db.batches[0][0].values.length, 8 * 9);
});

test('trace-tree multi-row statements execute against SQLite', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE project (
      id INTEGER PRIMARY KEY, user_uuid TEXT NOT NULL, avg_duration INTEGER NOT NULL DEFAULT 0,
      cost_units INTEGER NOT NULL DEFAULT 0, cost TEXT NOT NULL DEFAULT '0.0000000000',
      last_update_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE s3_compatible_object (
      object_key TEXT PRIMARY KEY, content_type TEXT NOT NULL, content_encoding TEXT NOT NULL,
      schema_version INTEGER NOT NULL, raw_size_bytes INTEGER NOT NULL,
      stored_size_bytes INTEGER NOT NULL, sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE trace (
      id TEXT PRIMARY KEY, parent_trace_id TEXT, project_name TEXT NOT NULL,
      project_id INTEGER NOT NULL, name TEXT NOT NULL, conversation_id TEXT NOT NULL,
      tags TEXT NOT NULL, payload_object_key TEXT NOT NULL, error_info TEXT,
      start_time TEXT NOT NULL, last_update_timestamp TEXT NOT NULL
    );
    CREATE TABLE step (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, trace_id TEXT, parent_step_id TEXT,
      type TEXT NOT NULL, tags TEXT NOT NULL, payload_object_key TEXT NOT NULL,
      error_info TEXT, model TEXT, usage TEXT, project_name TEXT NOT NULL,
      project_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT
    );
    CREATE TABLE step_meta (
      id TEXT PRIMARY KEY, metadata TEXT, cost TEXT NOT NULL, cost_units INTEGER NOT NULL
    );
    INSERT INTO project (id, user_uuid) VALUES (1, 'user-1');
  `);
  const db = new SqliteBatchDb(sqlite);
  const traces = Array.from({ length: 2 }, (_, index) => {
    const id = `trace-${index + 1}`;
    return {
      id, parentTraceId: null, projectName: 'demo', projectId: 1,
      name: id, conversationId: 'conversation', tags: [], errorInfo: null,
      startTime: '2026-07-10T00:00:00Z', lastUpdateTimestamp: '2026-07-10T00:00:01Z',
      payloadObjectKey: `payloads/v2/trace/${id}.json.gz`,
    };
  });
  const steps = Array.from({ length: 2 }, (_, index) => {
    const id = `step-${index + 1}`;
    return {
      id, name: id, traceId: traces[index].id, parentStepId: null,
      type: 'general', tags: [], errorInfo: null, model: null, usage: null,
      projectName: 'demo', projectId: 1, startTime: '2026-07-10T00:00:00Z',
      endTime: '2026-07-10T00:00:01Z', payloadObjectKey: `payloads/v2/step/${id}.json.gz`,
    };
  });

  await upsertBatchForUser(
    db as unknown as D1Database,
    'user-1',
    traces.map((trace) => ({ trace, payloadObject: payloadObject('trace', trace.id) })),
    steps.map((step) => ({
      step,
      payloadObject: payloadObject('step', step.id),
      metadata: { description: null },
      cost: '0.0000000000',
    })),
    [1],
  );

  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM trace').get()?.count, 2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM step').get()?.count, 2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM step_meta').get()?.count, 2);
});
