/** Step persistence: Drizzle handles typed reads; raw D1 batch is reserved for atomic billing mutations. */
import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { projects, s3CompatibleObjects, stepMeta, steps as stepTable } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { JsonObject, S3CompatibleObject, Step, StepMeta, StepSummary, TokenSnapshot, Usage } from '../domain/types.js';
import { parseJson, stringifyJson } from '../lib/utils.js';
import { toCostUnits } from '../lib/decimal.js';
import { upsertS3CompatibleObjectStatement } from './s3-compatible-object.js';

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

function toStep(row: typeof stepTable.$inferSelect, cost: string | null): Step {
  if (!row.payloadObjectKey) throw new Error('Step payload pointer is missing');
  return {
    id: row.id,
    parentStepId: row.parentStepId,
    name: row.name,
    traceId: row.traceId,
    type: row.type,
    tags: parseJson<string[]>(row.tags, []),
    payloadObjectKey: row.payloadObjectKey,
    errorInfo: row.errorInfo,
    model: row.model,
    usage: parseJson<Usage>(row.usage),
    projectName: row.projectName,
    projectId: row.projectId,
    startTime: row.startTime,
    endTime: row.endTime,
    cost,
  };
}

interface StepSummaryRow {
  id: string;
  parentStepId: string | null;
  name: string;
  traceId: string | null;
  type: string;
  tags: string;
  errorInfo: string | null;
  model: string | null;
  usage: string | null;
  projectName: string;
  projectId: number;
  startTime: string;
  endTime: string | null;
  rawSizeBytes: number | null;
}

const stepSummaryFields = {
  id: stepTable.id,
  parentStepId: stepTable.parentStepId,
  name: stepTable.name,
  traceId: stepTable.traceId,
  type: stepTable.type,
  tags: stepTable.tags,
  errorInfo: stepTable.errorInfo,
  model: stepTable.model,
  usage: stepTable.usage,
  projectName: stepTable.projectName,
  projectId: stepTable.projectId,
  startTime: stepTable.startTime,
  endTime: stepTable.endTime,
  rawSizeBytes: s3CompatibleObjects.rawSizeBytes,
};

function toStepSummary(row: StepSummaryRow, cost: string | null): StepSummary {
  const { rawSizeBytes, ...summary } = row;
  return {
    ...summary,
    tags: parseJson<string[]>(row.tags, []),
    usage: parseJson<Usage>(row.usage),
    cost,
    payloadSize: rawSizeBytes,
  };
}

/**
 * Writes a step, its metadata, and the exact fixed-point project-cost delta in
 * one D1 transaction. Every mutation is user-scoped in SQL.
 */
export async function upsertStepForUser(
  db: D1Database,
  userId: string,
  step: Step,
  payloadObject: S3CompatibleObject,
  metadata: JsonObject,
  cost: string,
): Promise<void> {
  const costUnits = toCostUnits(cost);
  const totalUnits = `(cost_units + ? - COALESCE((SELECT cost_units FROM step_meta WHERE id = ?), 0))`;
  const results = await db.batch([
    upsertS3CompatibleObjectStatement(db, payloadObject),
    db.prepare(`INSERT INTO step (id, name, trace_id, parent_step_id, type, tags, payload_object_key, error_info, model, usage, project_name, project_id, start_time, end_time)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM project WHERE id = ? AND user_uuid = ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, trace_id = excluded.trace_id, parent_step_id = excluded.parent_step_id,
      type = excluded.type, tags = excluded.tags, payload_object_key = excluded.payload_object_key, error_info = excluded.error_info,
      model = excluded.model, usage = excluded.usage, project_name = excluded.project_name, project_id = excluded.project_id,
      start_time = excluded.start_time, end_time = excluded.end_time
      WHERE step.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(step.id, step.name, step.traceId, step.parentStepId, step.type, stringifyJson(step.tags), payloadObject.objectKey, step.errorInfo, step.model, stringifyJson(step.usage), step.projectName, step.projectId, step.startTime, step.endTime, step.projectId, userId, userId),
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
  if (results.slice(1).some((result) => result.meta.changes === 0)) throw new Error('Step is not owned by the authenticated user');
}

export async function findStepForUser(db: AppDatabase, userId: string, stepId: string): Promise<Step | null> {
  const row = await db.select({ step: stepTable, cost: stepMeta.cost }).from(stepTable)
    .innerJoin(projects, eq(projects.id, stepTable.projectId))
    .leftJoin(stepMeta, eq(stepMeta.id, stepTable.id))
    .where(and(eq(stepTable.id, stepId), eq(projects.userId, userId))).get();
  return row ? toStep(row.step, row.cost) : null;
}

export async function listSteps(db: AppDatabase, projectId: number, page: number, pageSize: number): Promise<{ total: number; data: StepSummary[] }> {
  const totalRow = await db.select({ value: count() }).from(stepTable).where(eq(stepTable.projectId, projectId)).get();
  const rows = await db.select({ ...stepSummaryFields, cost: stepMeta.cost }).from(stepTable)
    .leftJoin(stepMeta, eq(stepMeta.id, stepTable.id))
    .leftJoin(s3CompatibleObjects, eq(s3CompatibleObjects.objectKey, stepTable.payloadObjectKey))
    .where(eq(stepTable.projectId, projectId))
    .orderBy(desc(stepTable.startTime)).limit(pageSize).offset(page * pageSize).all();
  return { total: totalRow?.value ?? 0, data: rows.map((row) => toStepSummary(row, row.cost)) };
}

export async function listStepsByTraceForUser(db: AppDatabase, userId: string, traceId: string): Promise<StepSummary[]> {
  const rows = await db.select({ ...stepSummaryFields, cost: stepMeta.cost }).from(stepTable)
    .innerJoin(projects, eq(projects.id, stepTable.projectId))
    .leftJoin(stepMeta, eq(stepMeta.id, stepTable.id))
    .leftJoin(s3CompatibleObjects, eq(s3CompatibleObjects.objectKey, stepTable.payloadObjectKey))
    .where(and(eq(stepTable.traceId, traceId), eq(projects.userId, userId)))
    .orderBy(stepTable.startTime).all();
  return rows.map((row) => toStepSummary(row, row.cost));
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

export async function findStepMetaForUser(db: AppDatabase, userId: string, stepId: string): Promise<StepMeta | null> {
  const row = await db.select({
    id: stepMeta.id,
    metadata: stepMeta.metadata,
    cost: stepMeta.cost,
  }).from(stepMeta)
    .innerJoin(stepTable, eq(stepTable.id, stepMeta.id))
    .innerJoin(projects, eq(projects.id, stepTable.projectId))
    .where(and(eq(stepMeta.id, stepId), eq(projects.userId, userId))).get();
  if (!row || row.metadata === null) return null;
  return { id: row.id, metadata: row.metadata, cost: row.cost };
}

export async function tokenSnapshots(db: AppDatabase, projectIds: number[]): Promise<TokenSnapshot[]> {
  if (!projectIds.length) return [];
  const rows = await db.select({
    projectId: stepTable.projectId,
    startTime: stepTable.startTime,
    usage: stepTable.usage,
  }).from(stepTable)
    .where(and(inArray(stepTable.projectId, projectIds), isNotNull(stepTable.usage))).all();
  return rows.map((row) => ({ projectId: row.projectId, startTime: row.startTime, usage: row.usage! }));
}
