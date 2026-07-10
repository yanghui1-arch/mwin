import { traceFromRow, type TraceRow } from './repository-mappers.js';
import type { Trace } from './types.js';
import { stringifyJson } from './utils.js';

export async function upsertTrace(db: D1Database, trace: Trace): Promise<void> {
  await db.prepare(`INSERT INTO trace (id, project_name, project_id, name, conversation_id, tags, input, output, error_info, start_time, last_update_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET project_name = excluded.project_name,
    project_id = excluded.project_id, name = excluded.name, conversation_id = excluded.conversation_id, tags = excluded.tags,
    input = excluded.input, output = excluded.output, error_info = excluded.error_info, start_time = excluded.start_time,
    last_update_timestamp = excluded.last_update_timestamp`)
    .bind(trace.id, trace.projectName, trace.projectId, trace.name, trace.conversationId, stringifyJson(trace.tags), stringifyJson(trace.input), stringifyJson(trace.output), trace.errorInfo, trace.startTime, trace.lastUpdateTimestamp).run();
}
export async function findTrace(db: D1Database, traceId: string): Promise<Trace | null> {
  return traceFromRow(await db.prepare('SELECT * FROM trace WHERE id = ?').bind(traceId).first<TraceRow>());
}
export async function countTraces(db: D1Database, projectId: number): Promise<number> {
  return (await db.prepare('SELECT COUNT(*) AS count FROM trace WHERE project_id = ?').bind(projectId).first<{ count: number }>())?.count ?? 0;
}
export async function listTraces(db: D1Database, projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Trace[] }> {
  const total = await countTraces(db, projectId);
  const { results } = await db.prepare('SELECT * FROM trace WHERE project_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?').bind(projectId, pageSize, page * pageSize).all<TraceRow>();
  return { total, data: results.map((row) => traceFromRow(row)!) };
}
export async function deleteTraces(db: D1Database, traceIds: string[]): Promise<string[]> {
  for (const id of traceIds) await db.prepare('DELETE FROM trace WHERE id = ?').bind(id).run();
  return traceIds;
}
