import { stepFromRow, type StepRow } from './mappers.js';
import type { JsonObject, Step, StepMeta, TokenSnapshot } from '../domain/types.js';
import { stringifyJson } from '../lib/utils.js';

export async function upsertStep(db: D1Database, step: Step): Promise<void> {
  await db.prepare(`INSERT INTO step (id, name, trace_id, parent_step_id, type, tags, input, output, error_info, model, usage, project_name, project_id, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name,
    trace_id = excluded.trace_id, parent_step_id = excluded.parent_step_id, type = excluded.type, tags = excluded.tags,
    input = excluded.input, output = excluded.output, error_info = excluded.error_info, model = excluded.model,
    usage = excluded.usage, project_name = excluded.project_name, project_id = excluded.project_id,
    start_time = excluded.start_time, end_time = excluded.end_time`)
    .bind(step.id, step.name, step.traceId, step.parentStepId, step.type, stringifyJson(step.tags), stringifyJson(step.input), stringifyJson(step.output), step.errorInfo, step.model, stringifyJson(step.usage), step.projectName, step.projectId, step.startTime, step.endTime).run();
}
export async function findStep(db: D1Database, stepId: string): Promise<Step | null> {
  return stepFromRow(await db.prepare('SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id WHERE step.id = ?').bind(stepId).first<StepRow>());
}
export async function listSteps(db: D1Database, projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Step[] }> {
  const total = (await db.prepare('SELECT COUNT(*) AS count FROM step WHERE project_id = ?').bind(projectId).first<{ count: number }>())?.count ?? 0;
  const { results } = await db.prepare('SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id WHERE project_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?').bind(projectId, pageSize, page * pageSize).all<StepRow>();
  return { total, data: results.map((row) => stepFromRow(row)!) };
}
export async function listStepsByTrace(db: D1Database, traceId: string): Promise<Step[]> {
  const { results } = await db.prepare('SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id WHERE trace_id = ? ORDER BY start_time ASC').bind(traceId).all<StepRow>();
  return results.map((row) => stepFromRow(row)!);
}
export async function deleteSteps(db: D1Database, stepIds: string[]): Promise<string[]> {
  for (const id of stepIds) await db.prepare('DELETE FROM step WHERE id = ?').bind(id).run();
  return stepIds;
}
export async function findStepMeta(db: D1Database, stepId: string): Promise<StepMeta | null> {
  return db.prepare('SELECT * FROM step_meta WHERE id = ?').bind(stepId).first<StepMeta>();
}
export async function upsertStepMeta(db: D1Database, stepId: string, metadata: JsonObject, cost: string): Promise<StepMeta> {
  await db.prepare(`INSERT INTO step_meta (id, metadata, cost) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET metadata = excluded.metadata, cost = excluded.cost`).bind(stepId, stringifyJson(metadata), cost).run();
  return { id: stepId, metadata: JSON.stringify(metadata), cost };
}
export async function tokenSnapshots(db: D1Database, projectIds: number[]): Promise<TokenSnapshot[]> {
  if (!projectIds.length) return [];
  const placeholders = projectIds.map(() => '?').join(',');
  return (await db.prepare(`SELECT start_time, usage FROM step WHERE project_id IN (${placeholders}) AND usage IS NOT NULL`).bind(...projectIds).all<TokenSnapshot>()).results;
}
