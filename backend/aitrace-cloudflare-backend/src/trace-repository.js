import { traceFromRow } from './repository-mappers.js';
import { stringifyJson } from './utils.js';

export async function upsertTrace(db, trace) {
  await db.prepare(
    `INSERT INTO trace (id, project_name, project_id, name, conversation_id, tags, input, output, error_info, start_time, last_update_timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET project_name = excluded.project_name, project_id = excluded.project_id,
     name = excluded.name, conversation_id = excluded.conversation_id, tags = excluded.tags, input = excluded.input,
     output = excluded.output, error_info = excluded.error_info, start_time = excluded.start_time,
     last_update_timestamp = excluded.last_update_timestamp`
  ).bind(trace.id, trace.projectName, trace.projectId, trace.name, trace.conversationId, stringifyJson(trace.tags), stringifyJson(trace.input), stringifyJson(trace.output), trace.errorInfo, trace.startTime, trace.lastUpdateTimestamp).run();
}

export async function findTrace(db, traceId) {
  return traceFromRow(await db.prepare('SELECT * FROM trace WHERE id = ?').bind(traceId).first());
}

export async function countTraces(db, projectId) {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM trace WHERE project_id = ?').bind(projectId).first();
  return row.count;
}

export async function listTraces(db, projectId, page, pageSize) {
  const offset = page * pageSize;
  const total = await db.prepare('SELECT COUNT(*) AS count FROM trace WHERE project_id = ?').bind(projectId).first();
  const { results } = await db.prepare('SELECT * FROM trace WHERE project_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?')
    .bind(projectId, pageSize, offset).all();
  return { total: total.count, data: results.map(traceFromRow) };
}

export async function deleteTraces(db, traceIds) {
  for (const id of traceIds) {
    await db.prepare('DELETE FROM trace WHERE id = ?').bind(id).run();
  }
  return traceIds;
}
