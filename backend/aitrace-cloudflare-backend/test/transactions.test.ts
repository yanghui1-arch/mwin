import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/index.js';
import { rotateApiKey } from '../src/repositories/user.js';
import { upsertTraceForUser } from '../src/repositories/trace.js';
import { upsertStepForUser } from '../src/repositories/step.js';

interface RecordedStatement { sql: string; values: unknown[] }

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

test('key rotation is issued as one two-statement D1 transaction', async () => {
  const rawDb = new RecordingDb();
  await rotateApiKey(createDatabase(rawDb as unknown as D1Database), {
    id: 'key-1', userId: 'user-1', key: 'at-new', createdTime: '2026-07-10T00:00:00Z',
  });

  assert.equal(rawDb.batches.length, 1);
  assert.equal(rawDb.batches[0].length, 2);
  assert.match(rawDb.batches[0][0].sql, /^DELETE FROM api_key/);
  assert.match(rawDb.batches[0][1].sql, /^INSERT INTO api_key/);
});

test('trace and step telemetry mutations keep dependent writes in one batch', async () => {
  const db = new RecordingDb();
  await upsertTraceForUser(db as unknown as D1Database, 'user-1', {
    id: 'trace-1', projectName: 'demo', projectId: 1, name: 'trace', conversationId: 'conversation',
    tags: [], input: null, output: null, errorInfo: null, startTime: '2026-07-10T00:00:00Z',
    lastUpdateTimestamp: '2026-07-10T00:00:01Z',
  });
  await upsertStepForUser(db as unknown as D1Database, 'user-1', {
    id: 'step-1', name: 'step', traceId: 'trace-1', parentStepId: null, type: 'llm', tags: [],
    input: null, output: null, errorInfo: null, model: 'gpt-5.5', usage: null, projectName: 'demo',
    projectId: 1, startTime: '2026-07-10T00:00:00Z', endTime: '2026-07-10T00:00:01Z',
  }, { description: null }, '0.0002699980');

  assert.equal(db.batches.length, 2);
  assert.equal(db.batches[0].length, 2);
  assert.equal(db.batches[1].length, 3);
  assert.match(db.batches[1][1].sql, /^UPDATE project SET/);
  assert.match(db.batches[1][2].sql, /^INSERT INTO step_meta/);
});
