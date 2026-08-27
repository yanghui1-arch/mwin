/** Trace persistence: Drizzle handles typed reads; raw D1 batch is reserved for atomic aggregate mutations. */
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { projects, s3CompatibleObjects, traces as traceTable } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { S3CompatibleObject, Trace, TraceSummary } from '../domain/types.js';
import { parseJson, stringifyJson } from '../lib/utils.js';
import { upsertS3CompatibleObjectStatement } from './s3-compatible-object.js';

interface IdentifierRow { id: string }

const COST_UNITS = `COALESCE((
  SELECT SUM(step_meta.cost_units)
  FROM step INNER JOIN step_meta ON step_meta.id = step.id
  WHERE step.project_id = project.id
), 0)`;

function formattedCost(units: string): string {
  return `printf('%s%d.%010d',
    CASE WHEN (${units}) < 0 THEN '-' ELSE '' END,
    ABS(${units}) / 10000000000,
    ABS(${units}) % 10000000000)`;
}

function projectAggregateStatement(db: D1Database, userId: string): D1PreparedStatement {
  return db.prepare(`UPDATE project SET
    avg_duration = COALESCE((
      SELECT CAST(AVG((julianday(trace.last_update_timestamp) - julianday(trace.start_time)) * 86400000) AS INTEGER)
      FROM trace WHERE trace.project_id = project.id
    ), 0),
    cost_units = ${COST_UNITS},
    cost = ${formattedCost(COST_UNITS)},
    last_update_timestamp = CURRENT_TIMESTAMP
    WHERE user_uuid = ?`).bind(userId);
}

function toTrace(row: typeof traceTable.$inferSelect): Trace {
  if (!row.payloadObjectKey) throw new Error('Trace payload pointer is missing');
  return {
    id: row.id,
    parentTraceId: row.parentTraceId,
    projectName: row.projectName,
    projectId: row.projectId,
    name: row.name,
    conversationId: row.conversationId,
    tags: parseJson<string[]>(row.tags, []),
    payloadObjectKey: row.payloadObjectKey,
    errorInfo: row.errorInfo,
    startTime: row.startTime,
    lastUpdateTimestamp: row.lastUpdateTimestamp,
  };
}

interface TraceSummaryRow {
  id: string;
  parentTraceId: string | null;
  projectName: string;
  projectId: number;
  name: string;
  conversationId: string;
  tags: string;
  errorInfo: string | null;
  startTime: string;
  lastUpdateTimestamp: string;
  rawSizeBytes: number | null;
  stepCount: number;
}

const traceSummaryFields = {
  id: traceTable.id,
  parentTraceId: traceTable.parentTraceId,
  projectName: traceTable.projectName,
  projectId: traceTable.projectId,
  name: traceTable.name,
  conversationId: traceTable.conversationId,
  tags: traceTable.tags,
  errorInfo: traceTable.errorInfo,
  startTime: traceTable.startTime,
  lastUpdateTimestamp: traceTable.lastUpdateTimestamp,
  rawSizeBytes: s3CompatibleObjects.rawSizeBytes,
  stepCount: sql<number>`(SELECT COUNT(*) FROM step WHERE step.trace_id = ${traceTable.id})`,
};

function toTraceSummary(row: TraceSummaryRow): TraceSummary {
  const { rawSizeBytes, ...summary } = row;
  return { ...summary, tags: parseJson<string[]>(row.tags, []), payloadSize: rawSizeBytes };
}

/**
 * Upserts a trace and recomputes the owner's project aggregates in one D1
 * transaction. The UPSERT itself refuses to overwrite another user's trace.
 */
export async function upsertTraceForUser(
  db: D1Database,
  userId: string,
  trace: Trace,
  payloadObject: S3CompatibleObject,
): Promise<void> {
  const results = await db.batch([
    upsertS3CompatibleObjectStatement(db, payloadObject),
    db.prepare(`INSERT INTO trace (id, parent_trace_id, project_name, project_id, name, conversation_id, tags, payload_object_key, error_info, start_time, last_update_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET parent_trace_id = excluded.parent_trace_id, project_name = excluded.project_name,
      project_id = excluded.project_id, name = excluded.name, conversation_id = excluded.conversation_id, tags = excluded.tags,
      payload_object_key = excluded.payload_object_key, error_info = excluded.error_info, start_time = excluded.start_time,
      last_update_timestamp = excluded.last_update_timestamp
      WHERE trace.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(trace.id, trace.parentTraceId, trace.projectName, trace.projectId, trace.name, trace.conversationId, stringifyJson(trace.tags), payloadObject.objectKey, trace.errorInfo, trace.startTime, trace.lastUpdateTimestamp, userId),
    db.prepare(`UPDATE project SET
      avg_duration = COALESCE((
        SELECT CAST(AVG((julianday(trace.last_update_timestamp) - julianday(trace.start_time)) * 86400000) AS INTEGER)
        FROM trace WHERE trace.project_id = project.id
      ), 0),
      last_update_timestamp = CURRENT_TIMESTAMP
      WHERE id = ? AND user_uuid = ?
        AND EXISTS (SELECT 1 FROM trace WHERE trace.id = ? AND trace.project_id = project.id)`)
      .bind(trace.projectId, userId, trace.id),
  ]);
  if (results[1].meta.changes === 0) throw new Error('Trace is not owned by the authenticated user');
}

export async function findTrace(db: AppDatabase, traceId: string): Promise<Trace | null> {
  const row = await db.select().from(traceTable).where(eq(traceTable.id, traceId)).get();
  return row ? toTrace(row) : null;
}

export async function findTraceForUser(db: AppDatabase, userId: string, traceId: string): Promise<Trace | null> {
  const row = await db.select({ trace: traceTable }).from(traceTable)
    .innerJoin(projects, eq(projects.id, traceTable.projectId))
    .where(and(eq(traceTable.id, traceId), eq(projects.userId, userId))).get();
  return row ? toTrace(row.trace) : null;
}

export async function countTraces(db: AppDatabase, projectId: number): Promise<number> {
  const row = await db.select({ value: count() }).from(traceTable).where(eq(traceTable.projectId, projectId)).get();
  return row?.value ?? 0;
}

export async function listTraces(db: AppDatabase, projectId: number, page: number, pageSize: number): Promise<{ total: number; data: TraceSummary[] }> {
  const total = await countTraces(db, projectId);
  const rows = await db.select(traceSummaryFields).from(traceTable)
    .leftJoin(s3CompatibleObjects, eq(s3CompatibleObjects.objectKey, traceTable.payloadObjectKey))
    .where(eq(traceTable.projectId, projectId))
    .orderBy(desc(traceTable.startTime)).limit(pageSize).offset(page * pageSize).all();
  return { total, data: rows.map(toTraceSummary) };
}

/** Deletes only caller-owned traces, their steps and metadata, then rebuilds aggregates atomically. */
export async function deleteTracesForUser(db: D1Database, userId: string, traceIds: string[]): Promise<string[]> {
  if (!traceIds.length) return [];
  const placeholders = traceIds.map(() => '?').join(', ');
  const owned = `id IN (${placeholders}) AND project_id IN (SELECT id FROM project WHERE user_uuid = ?)`;
  const results = await db.batch([
    db.prepare(`SELECT id FROM trace WHERE ${owned}`).bind(...traceIds, userId),
    db.prepare(`DELETE FROM step_meta WHERE id IN (SELECT id FROM step WHERE trace_id IN (${placeholders})
      AND project_id IN (SELECT id FROM project WHERE user_uuid = ?))`).bind(...traceIds, userId),
    db.prepare(`DELETE FROM step WHERE trace_id IN (${placeholders})
      AND project_id IN (SELECT id FROM project WHERE user_uuid = ?)`).bind(...traceIds, userId),
    db.prepare(`DELETE FROM trace WHERE ${owned}`).bind(...traceIds, userId),
    projectAggregateStatement(db, userId),
  ]);
  return ((results[0].results ?? []) as IdentifierRow[]).map((row) => row.id);
}
