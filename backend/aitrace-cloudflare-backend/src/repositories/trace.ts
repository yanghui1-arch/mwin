/** Trace persistence: Drizzle handles typed reads; raw D1 batch is reserved for atomic aggregate mutations. */
import { count, desc, eq } from 'drizzle-orm';
import { traces as traceTable } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { JsonObject, Trace } from '../domain/types.js';
import { parseJson, stringifyJson } from '../lib/utils.js';

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
  return {
    id: row.id,
    parentTraceId: row.parentTraceId,
    projectName: row.projectName,
    projectId: row.projectId,
    name: row.name,
    conversationId: row.conversationId,
    tags: parseJson<string[]>(row.tags, []),
    input: parseJson<JsonObject>(row.input),
    output: parseJson<JsonObject>(row.output),
    errorInfo: row.errorInfo,
    startTime: row.startTime,
    lastUpdateTimestamp: row.lastUpdateTimestamp,
  };
}

/**
 * Upserts a trace and recomputes the owner's project aggregates in one D1
 * transaction. The UPSERT itself refuses to overwrite another user's trace.
 */
export async function upsertTraceForUser(db: D1Database, userId: string, trace: Trace): Promise<void> {
  const results = await db.batch([
    db.prepare(`INSERT INTO trace (id, parent_trace_id, project_name, project_id, name, conversation_id, tags, input, output, error_info, start_time, last_update_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET parent_trace_id = excluded.parent_trace_id, project_name = excluded.project_name,
      project_id = excluded.project_id, name = excluded.name, conversation_id = excluded.conversation_id, tags = excluded.tags,
      input = excluded.input, output = excluded.output, error_info = excluded.error_info, start_time = excluded.start_time,
      last_update_timestamp = excluded.last_update_timestamp
      WHERE trace.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(trace.id, trace.parentTraceId, trace.projectName, trace.projectId, trace.name, trace.conversationId, stringifyJson(trace.tags), stringifyJson(trace.input), stringifyJson(trace.output), trace.errorInfo, trace.startTime, trace.lastUpdateTimestamp, userId),
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
  if (results[0].meta.changes === 0) throw new Error('Trace is not owned by the authenticated user');
}

export async function findTrace(db: AppDatabase, traceId: string): Promise<Trace | null> {
  const row = await db.select().from(traceTable).where(eq(traceTable.id, traceId)).get();
  return row ? toTrace(row) : null;
}

export async function countTraces(db: AppDatabase, projectId: number): Promise<number> {
  const row = await db.select({ value: count() }).from(traceTable).where(eq(traceTable.projectId, projectId)).get();
  return row?.value ?? 0;
}

export async function listTraces(db: AppDatabase, projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Trace[] }> {
  const total = await countTraces(db, projectId);
  const rows = await db.select().from(traceTable).where(eq(traceTable.projectId, projectId))
    .orderBy(desc(traceTable.startTime)).limit(pageSize).offset(page * pageSize).all();
  return { total, data: rows.map(toTrace) };
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
