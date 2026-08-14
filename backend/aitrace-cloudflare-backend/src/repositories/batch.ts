import type { BatchStepWrite, Trace } from '../domain/types.js';
import { toCostUnits } from '../lib/decimal.js';
import { stringifyJson } from '../lib/utils.js';

function formattedCost(units: string): string {
  return `printf('%s%d.%010d',
    CASE WHEN (${units}) < 0 THEN '-' ELSE '' END,
    ABS(${units}) / 10000000000,
    ABS(${units}) % 10000000000)`;
}

/** Atomically upserts complete trace trees and rebuilds each project once. */
export async function upsertBatchForUser(
  db: D1Database,
  userId: string,
  traces: Trace[],
  stepWrites: BatchStepWrite[],
  projectIds: number[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const trace of traces) {
    statements.push(db.prepare(`INSERT INTO trace
      (id, parent_trace_id, project_name, project_id, name, conversation_id, tags, input, output, error_info, start_time, last_update_timestamp)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM project WHERE id = ? AND user_uuid = ?)
      ON CONFLICT(id) DO UPDATE SET parent_trace_id = excluded.parent_trace_id,
      project_name = excluded.project_name, project_id = excluded.project_id, name = excluded.name,
      conversation_id = excluded.conversation_id, tags = excluded.tags, input = excluded.input,
      output = excluded.output, error_info = excluded.error_info, start_time = excluded.start_time,
      last_update_timestamp = excluded.last_update_timestamp
      WHERE trace.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(
        trace.id, trace.parentTraceId, trace.projectName, trace.projectId, trace.name,
        trace.conversationId, stringifyJson(trace.tags), stringifyJson(trace.input),
        stringifyJson(trace.output), trace.errorInfo, trace.startTime, trace.lastUpdateTimestamp,
        trace.projectId, userId, userId,
      ));
  }

  for (const { step, metadata, cost } of stepWrites) {
    statements.push(db.prepare(`INSERT INTO step
      (id, name, trace_id, parent_step_id, type, tags, input, output, error_info, model, usage, project_name, project_id, start_time, end_time)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM project WHERE id = ? AND user_uuid = ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, trace_id = excluded.trace_id,
      parent_step_id = excluded.parent_step_id, type = excluded.type, tags = excluded.tags,
      input = excluded.input, output = excluded.output, error_info = excluded.error_info,
      model = excluded.model, usage = excluded.usage, project_name = excluded.project_name,
      project_id = excluded.project_id, start_time = excluded.start_time, end_time = excluded.end_time
      WHERE step.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(
        step.id, step.name, step.traceId, step.parentStepId, step.type, stringifyJson(step.tags),
        stringifyJson(step.input), stringifyJson(step.output), step.errorInfo, step.model,
        stringifyJson(step.usage), step.projectName, step.projectId, step.startTime, step.endTime,
        step.projectId, userId, userId,
      ));
    statements.push(db.prepare(`INSERT INTO step_meta (id, metadata, cost, cost_units)
      SELECT ?, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM step INNER JOIN project ON project.id = step.project_id
        WHERE step.id = ? AND project.user_uuid = ?
      )
      ON CONFLICT(id) DO UPDATE SET metadata = excluded.metadata,
      cost = excluded.cost, cost_units = excluded.cost_units`)
      .bind(step.id, stringifyJson(metadata), cost, toCostUnits(cost), step.id, userId));
  }

  for (const projectId of new Set(projectIds)) {
    const costUnits = `COALESCE((
      SELECT SUM(step_meta.cost_units) FROM step
      INNER JOIN step_meta ON step_meta.id = step.id
      WHERE step.project_id = project.id
    ), 0)`;
    statements.push(db.prepare(`UPDATE project SET
      avg_duration = COALESCE((
        SELECT CAST(AVG((julianday(trace.last_update_timestamp) - julianday(trace.start_time)) * 86400000) AS INTEGER)
        FROM trace WHERE trace.project_id = project.id
      ), 0),
      cost_units = ${costUnits},
      cost = ${formattedCost(costUnits)},
      last_update_timestamp = CURRENT_TIMESTAMP
      WHERE id = ? AND user_uuid = ?`).bind(projectId, userId));
  }

  if (statements.length) await db.batch(statements);
}
