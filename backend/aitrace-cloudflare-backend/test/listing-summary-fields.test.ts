import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/index.js';
import { listSteps } from '../src/repositories/step.js';
import { listTraces } from '../src/repositories/trace.js';
import { D1Shim, buildDatabase, seedData } from './helpers/listing-db.js';

/**
 * Verifies that the step/trace list queries expose the payload size (joined
 * from s3_compatible_object) and the per-trace step count that the web
 * dashboard renders in the Size/Steps columns (#55, PR #56).
 */

test('step and trace lists expose payload size and trace step counts', async () => {
  const sqlite = buildDatabase();
  seedData(sqlite);
  const db = createDatabase(new D1Shim(sqlite) as unknown as D1Database);

  const steps = await listSteps(db, 1, 0, 10);
  assert.equal(steps.total, 3);
  const stepSizes = new Map(steps.data.map((row) => [row.id, row.payloadSize]));
  assert.equal(stepSizes.get('step-a'), 1234);
  assert.equal(stepSizes.get('step-b'), 56);
  assert.equal(stepSizes.get('step-orphan'), 77);

  const traces = await listTraces(db, 1, 0, 10);
  assert.equal(traces.total, 3);
  const traceRows = new Map(traces.data.map((row) => [row.id, row]));
  assert.equal(traceRows.get('trace-1')!.payloadSize, 2048);
  assert.equal(traceRows.get('trace-1')!.stepCount, 2);
  assert.equal(traceRows.get('trace-2')!.payloadSize, 1);
  assert.equal(traceRows.get('trace-2')!.stepCount, 1);
  assert.equal(traceRows.get('trace-3')!.payloadSize, null);
  assert.equal(traceRows.get('trace-3')!.stepCount, 0);
});
