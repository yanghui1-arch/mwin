/** D1 operations for steps, metadata, and usage snapshots. */
import { stepFromRow, type StepRow } from './mappers.js';
import type { JsonObject, Step, StepMeta, TokenSnapshot } from '../domain/types.js';
import { stringifyJson } from '../lib/utils.js';
import { toCostUnits } from '../lib/decimal.js';

interface IdentifierRow { id: string }

function formattedCost(units: string): string {
  return `printf('%s%d.%010d',
    CASE WHEN (${units}) < 0 THEN '-' ELSE '' END,
    ABS(${units}) / 10000000000,
    ABS(${units}) % 10000000000)`;
}

function rebuildProjectCostsStatement(db: D1Database, userId: string): D1PreparedStatement {
  const units = `COALESCE((
    SELECT SUM(step_meta.cost_units)
    FROM step INNER JOIN step_meta ON step_meta.id = step.id
    WHERE step.project_id = project.id
  ), 0)`;
  return db.prepare(`UPDATE project SET
    cost_units = ${units},
    cost = ${formattedCost(units)},
    last_update_timestamp = CURRENT_TIMESTAMP
    WHERE user_uuid = ?`).bind(userId);
}

/**
 * Writes a step, its metadata, and the exact fixed-point project-cost delta in
 * one D1 transaction. Every mutation is user-scoped in SQL.
 */
export async function upsertStepForUser(db: D1Database, userId: string, step: Step, metadata: JsonObject, cost: string): Promise<void> {
  const costUnits = toCostUnits(cost);
  const totalUnits = `(cost_units + ? - COALESCE((SELECT cost_units FROM step_meta WHERE id = ?), 0))`;
  const results = await db.batch([
    db.prepare(`INSERT INTO step (id, name, trace_id, parent_step_id, type, tags, input, output, error_info, model, usage, project_name, project_id, start_time, end_time)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM project WHERE id = ? AND user_uuid = ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, trace_id = excluded.trace_id, parent_step_id = excluded.parent_step_id,
      type = excluded.type, tags = excluded.tags, input = excluded.input, output = excluded.output, error_info = excluded.error_info,
      model = excluded.model, usage = excluded.usage, project_name = excluded.project_name, project_id = excluded.project_id,
      start_time = excluded.start_time, end_time = excluded.end_time
      WHERE step.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(step.id, step.name, step.traceId, step.parentStepId, step.type, stringifyJson(step.tags), stringifyJson(step.input), stringifyJson(step.output), step.errorInfo, step.model, stringifyJson(step.usage), step.projectName, step.projectId, step.startTime, step.endTime, step.projectId, userId, userId),
    db.prepare(`UPDATE project SET
      cost_units = ${totalUnits},
      cost = ${formattedCost(totalUnits)},
      last_update_timestamp = CURRENT_TIMESTAMP
      WHERE id = ? AND user_uuid = ?
        AND EXISTS (SELECT 1 FROM step WHERE step.id = ? AND step.project_id = project.id)`)
      .bind(
        costUnits, step.id,
        costUnits, step.id,
        costUnits, step.id,
        costUnits, step.id,
        step.projectId, userId, step.id,
      ),
    db.prepare(`INSERT INTO step_meta (id, metadata, cost, cost_units)
      SELECT ?, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM step INNER JOIN project ON project.id = step.project_id
        WHERE step.id = ? AND step.project_id = ? AND project.user_uuid = ?
      )
      ON CONFLICT(id) DO UPDATE SET metadata = excluded.metadata, cost = excluded.cost, cost_units = excluded.cost_units`)
      .bind(step.id, stringifyJson(metadata), cost, costUnits, step.id, step.projectId, userId),
  ]);
  if (results.some((result) => result.meta.changes === 0)) throw new Error('Step is not owned by the authenticated user');
}

export async function findStep(db: D1Database, stepId: string): Promise<Step | null> {
  return stepFromRow(await db.prepare('SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id WHERE step.id = ?').bind(stepId).first<StepRow>());
}
export async function findStepForUser(db: D1Database, userId: string, stepId: string): Promise<Step | null> {
  return stepFromRow(await db.prepare(`SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id
    WHERE step.id = ? AND step.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`).bind(stepId, userId).first<StepRow>());
}
export async function listSteps(db: D1Database, projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Step[] }> {
  const total = (await db.prepare('SELECT COUNT(*) AS count FROM step WHERE project_id = ?').bind(projectId).first<{ count: number }>())?.count ?? 0;
  const { results } = await db.prepare('SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id WHERE project_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?').bind(projectId, pageSize, page * pageSize).all<StepRow>();
  return { total, data: results.map((row) => stepFromRow(row)!) };
}
export async function listStepsByTraceForUser(db: D1Database, userId: string, traceId: string): Promise<Step[]> {
  const { results } = await db.prepare(`SELECT step.*, step_meta.cost FROM step LEFT JOIN step_meta ON step_meta.id = step.id
    WHERE trace_id = ? AND project_id IN (SELECT id FROM project WHERE user_uuid = ?) ORDER BY start_time ASC`).bind(traceId, userId).all<StepRow>();
  return results.map((row) => stepFromRow(row)!);
}

/** Deletes a caller-owned set of steps and rebuilds the affected user's aggregates atomically. */
export async function deleteStepsForUser(db: D1Database, userId: string, stepIds: string[]): Promise<string[]> {
  if (!stepIds.length) return [];
  const placeholders = stepIds.map(() => '?').join(', ');
  const owned = `id IN (${placeholders}) AND project_id IN (SELECT id FROM project WHERE user_uuid = ?)`;
  const results = await db.batch([
    db.prepare(`SELECT id FROM step WHERE ${owned}`).bind(...stepIds, userId),
    db.prepare(`DELETE FROM step_meta WHERE id IN (SELECT id FROM step WHERE ${owned})`).bind(...stepIds, userId),
    db.prepare(`DELETE FROM step WHERE ${owned}`).bind(...stepIds, userId),
    rebuildProjectCostsStatement(db, userId),
  ]);
  return ((results[0].results ?? []) as IdentifierRow[]).map((row) => row.id);
}

export async function findStepMeta(db: D1Database, stepId: string): Promise<StepMeta | null> {
  return db.prepare('SELECT * FROM step_meta WHERE id = ?').bind(stepId).first<StepMeta>();
}
export async function findStepMetaForUser(db: D1Database, userId: string, stepId: string): Promise<StepMeta | null> {
  return db.prepare(`SELECT step_meta.* FROM step_meta INNER JOIN step ON step.id = step_meta.id
    WHERE step_meta.id = ? AND step.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`).bind(stepId, userId).first<StepMeta>();
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
