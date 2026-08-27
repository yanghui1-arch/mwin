import test from 'node:test';
import assert from 'node:assert/strict';
import { LogService } from '../src/services/log.js';
import type { JsonObject, Project, S3CompatibleObject, Step, StepMeta, StepPayload, StepPayloadChunkEntry, TracePayload } from '../src/domain/types.js';

class MemoryPayloadStorage {
  stepChunkCount = 0;
  failStepChunks = false;

  private object(kind: string, id: string): S3CompatibleObject {
    return { objectKey: `payloads/v2/${kind}/${id}.json.gz`, contentType: 'application/gzip', contentEncoding: 'gzip',
      schemaVersion: 2, rawSizeBytes: 1, storedSizeBytes: 1, sha256: '0'.repeat(64), createdAt: '', updatedAt: '' };
  }
  async storeStep(id: string, _payload: StepPayload) { return this.object('step', id); }
  async storeStepChunk(entries: StepPayloadChunkEntry[]) {
    if (this.failStepChunks) throw new Error('OSS unavailable');
    this.stepChunkCount++;
    return { ...this.object('step-chunk', entries[0].id), schemaVersion: 3 };
  }
  async storeTrace(id: string, _payload: TracePayload) { return this.object('trace', id); }
  async loadStep(_object: S3CompatibleObject, _stepId: string): Promise<StepPayload> { return { input: null, output: null }; }
  async loadTrace(_object: S3CompatibleObject): Promise<TracePayload> { return { input: null, output: null }; }
}

class MemoryRepositories {
  step: Step | null = null;
  meta: StepMeta | null = null;
  writtenCosts: string[] = [];
  batchStepCount = 0;
  batchCalls = 0;

  async findStepForUser(): Promise<Step | null> { return this.step; }
  async findStepMetaForUser(): Promise<StepMeta | null> { return this.meta; }
  async upsertStepForUser(_userId: string, step: Step, _payloadObject: S3CompatibleObject, metadata: JsonObject, cost: string): Promise<void> {
    this.step = step;
    this.meta = { id: step.id, metadata: JSON.stringify(metadata), cost };
    this.writtenCosts.push(cost);
  }
  async upsertTraceForUser(): Promise<void> {}
  async upsertBatchForUser(_userId: string, _traces: unknown[], steps: unknown[]): Promise<void> {
    this.batchCalls++;
    this.batchStepCount = steps.length;
  }
}

test('logStep supplies only the latest step cost to the atomic repository mutation', async () => {
  const repositories = new MemoryRepositories();
  const project: Project = { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null,
    averageDuration: 0, cost: '0.0000000000', createdTimestamp: '', lastUpdateTimestamp: '' };
  const service = new LogService(repositories, { ensureProject: async () => project }, new MemoryPayloadStorage());
  const request = {
    project_name: 'demo', step_id: 'step-1', step_name: 'call', trace_id: 'trace-1', step_type: 'llm', tags: [],
    input: { func_inputs: 'a' }, output: { llm_outputs: 'b' }, start_time: '2026-07-09T00:00:00Z',
    llm_provider: 'openai', model: 'gpt-5.5', usage: { prompt_tokens: 1000, completion_tokens: 1000 },
  };

  await service.logStep('user-1', request);
  await service.logStep('user-1', { ...request, usage: { prompt_tokens: 2000, completion_tokens: 1000 } });

  assert.deepEqual(repositories.writtenCosts, ['0.0002699980', '0.0003085680']);
});

test('logStep accepts a standalone step without a trace id', async () => {
  const repositories = new MemoryRepositories();
  const project: Project = { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null,
    averageDuration: 0, cost: '0.0000000000', createdTimestamp: '', lastUpdateTimestamp: '' };
  const service = new LogService(repositories, { ensureProject: async () => project }, new MemoryPayloadStorage());

  await service.logStep('user-1', {
    project_name: 'demo', step_id: 'step-standalone', step_name: 'call', trace_id: null, step_type: 'general', tags: [],
    input: { value: 'a' }, output: { value: 'b' }, start_time: '2026-07-09T00:00:00Z',
  });

  assert.equal(repositories.step?.traceId, null);
});

test('logTraceTree does not impose an application-level node limit', async () => {
  const repositories = new MemoryRepositories();
  const project: Project = { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null,
    averageDuration: 0, cost: '0.0000000000', createdTimestamp: '', lastUpdateTimestamp: '' };
  const storage = new MemoryPayloadStorage();
  const service = new LogService(repositories, { ensureProject: async () => project }, storage);
  const steps = Array.from({ length: 129 }, (_, index) => ({
    project_name: 'demo', step_id: `step-${index}`, step_name: 'call', step_type: 'general',
    tags: [], input: null, output: null, start_time: '2026-07-09T00:00:00Z',
  }));

  const result = await service.logTraceTree('user-1', { traces: [], steps });

  assert.deepEqual(result, { traces: 0, steps: 129 });
  assert.equal(repositories.batchStepCount, 129);
  assert.equal(storage.stepChunkCount, 9);
});

test('logTraceTree does not write the database when a Step chunk upload fails', async () => {
  const repositories = new MemoryRepositories();
  const project: Project = { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null,
    averageDuration: 0, cost: '0.0000000000', createdTimestamp: '', lastUpdateTimestamp: '' };
  const storage = new MemoryPayloadStorage();
  storage.failStepChunks = true;
  const service = new LogService(repositories, { ensureProject: async () => project }, storage);

  await assert.rejects(service.logTraceTree('user-1', {
    traces: [],
    steps: [{ project_name: 'demo', step_id: 'step-1', step_name: 'call', step_type: 'general',
      tags: [], input: null, output: null, start_time: '2026-07-09T00:00:00Z' }],
  }), /OSS unavailable/);

  assert.equal(repositories.batchCalls, 0);
});
