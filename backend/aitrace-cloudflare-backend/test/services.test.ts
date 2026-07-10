import test from 'node:test';
import assert from 'node:assert/strict';
import { LogService } from '../src/services/log.js';
import type { JsonObject, Project, Step, StepMeta } from '../src/domain/types.js';

class MemoryRepositories {
  project: Project = { id: 1, userId: 'user-1', name: 'demo', description: null, strategy: null,
    averageDuration: 0, cost: '0.0000000000', createdTimestamp: '', lastUpdateTimestamp: '' };
  step: Step | null = null;
  meta: StepMeta | null = null;
  updatedCosts: string[] = [];
  async findStep(): Promise<Step | null> { return this.step; }
  async upsertStep(step: Step): Promise<void> { this.step = step; }
  async findStepMeta(): Promise<StepMeta | null> { return this.meta; }
  async upsertStepMeta(id: string, metadata: JsonObject, cost: string): Promise<StepMeta> {
    return this.meta = { id, metadata: JSON.stringify(metadata), cost };
  }
  async updateProjectCost(_id: number, cost: string): Promise<void> { this.project.cost = cost; this.updatedCosts.push(cost); }
  async findTrace() { return null; }
  async upsertTrace() {}
  async countTraces() { return 0; }
  async updateProjectAverageDuration() {}
}

test('logStep updates project cost by step cost delta', async () => {
  const repositories = new MemoryRepositories();
  const service = new LogService(repositories, { ensureProject: async () => repositories.project });
  const request = {
    project_name: 'demo', step_id: 'step-1', step_name: 'call', trace_id: 'trace-1', step_type: 'llm', tags: [],
    input: { func_inputs: 'a' }, output: { llm_outputs: 'b' }, start_time: '2026-07-09T00:00:00Z',
    llm_provider: 'openai', model: 'gpt-5.5', usage: { prompt_tokens: 1000, completion_tokens: 1000 },
  };

  await service.logStep('user-1', request);
  assert.equal(repositories.project.cost, '0.0002699980');
  await service.logStep('user-1', { ...request, usage: { prompt_tokens: 2000, completion_tokens: 1000 } });
  assert.equal(repositories.project.cost, '0.0003085680');
  assert.deepEqual(repositories.updatedCosts, ['0.0002699980', '0.0003085680']);
});
