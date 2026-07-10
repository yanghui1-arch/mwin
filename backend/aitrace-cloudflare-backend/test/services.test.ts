import test from 'node:test';
import assert from 'node:assert/strict';
import { LogService } from '../src/services/log.js';
import type { JsonObject, Project, Step, StepMeta } from '../src/domain/types.js';

class MemoryRepositories {
  step: Step | null = null;
  meta: StepMeta | null = null;
  writtenCosts: string[] = [];

  async findStepForUser(): Promise<Step | null> { return this.step; }
  async findStepMetaForUser(): Promise<StepMeta | null> { return this.meta; }
  async upsertStepForUser(_userId: string, step: Step, metadata: JsonObject, cost: string): Promise<void> {
    this.step = step;
    this.meta = { id: step.id, metadata: JSON.stringify(metadata), cost };
    this.writtenCosts.push(cost);
  }
  async upsertTraceForUser(): Promise<void> {}
}

test('logStep supplies only the latest step cost to the atomic repository mutation', async () => {
  const repositories = new MemoryRepositories();
  const project: Project = { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null,
    averageDuration: 0, cost: '0.0000000000', createdTimestamp: '', lastUpdateTimestamp: '' };
  const service = new LogService(repositories, { ensureProject: async () => project });
  const request = {
    project_name: 'demo', step_id: 'step-1', step_name: 'call', trace_id: 'trace-1', step_type: 'llm', tags: [],
    input: { func_inputs: 'a' }, output: { llm_outputs: 'b' }, start_time: '2026-07-09T00:00:00Z',
    llm_provider: 'openai', model: 'gpt-5.5', usage: { prompt_tokens: 1000, completion_tokens: 1000 },
  };

  await service.logStep('user-1', request);
  await service.logStep('user-1', { ...request, usage: { prompt_tokens: 2000, completion_tokens: 1000 } });

  assert.deepEqual(repositories.writtenCosts, ['0.0002699980', '0.0003085680']);
});
