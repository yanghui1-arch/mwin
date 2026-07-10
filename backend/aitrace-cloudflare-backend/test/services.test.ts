import test from 'node:test';
import assert from 'node:assert/strict';
import { Services } from '../src/services.js';

class MemoryRepositories {
  constructor() {
    this.project = { id: 1, userId: 'user-1', name: 'demo', averageDuration: 0, cost: '0.0000000000' };
    this.step = null;
    this.meta = null;
    this.updatedCosts = [];
  }

  async findProject() { return this.project; }
  async findStep() { return this.step; }
  async upsertStep(step) { this.step = step; }
  async findStepMeta() { return this.meta; }
  async upsertStepMeta(id, metadata, cost) { this.meta = { id, metadata: JSON.stringify(metadata), cost }; }
  async updateProjectCost(id, cost) { this.project.cost = cost; this.updatedCosts.push(cost); }
}

test('logStep updates project cost by step cost delta', async () => {
  const repositories = new MemoryRepositories();
  const services = new Services(repositories);
  const request = {
    project_name: 'demo',
    step_id: 'step-1',
    step_name: 'call',
    trace_id: 'trace-1',
    step_type: 'llm',
    tags: [],
    input: { func_inputs: 'a' },
    output: { llm_outputs: 'b' },
    start_time: '2026-07-09T00:00:00Z',
    llm_provider: 'openai',
    model: 'gpt-5.5',
    usage: { prompt_tokens: 1000, completion_tokens: 1000 },
  };

  await services.logStep('user-1', request);
  assert.equal(repositories.project.cost, '0.0002699980');

  await services.logStep('user-1', { ...request, usage: { prompt_tokens: 2000, completion_tokens: 1000 } });
  assert.equal(repositories.project.cost, '0.0003085680');
  assert.deepEqual(repositories.updatedCosts, ['0.0002699980', '0.0003085680']);
});
