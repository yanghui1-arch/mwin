import type { BatchStepWrite, BatchTraceWrite } from '../domain/types.js';
import { toCostUnits } from '../lib/decimal.js';
import { stringifyJson } from '../lib/utils.js';
import { upsertS3CompatibleObjectStatements } from './s3-compatible-object.js';

const MAX_D1_BOUND_PARAMETERS = 100;
const TRACE_PARAMETER_COUNT = 12;
const STEP_PARAMETER_COUNT = 15;
const STEP_META_PARAMETER_COUNT = 4;

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
  traces: BatchTraceWrite[],
  stepWrites: BatchStepWrite[],
  projectIds: number[],
): Promise<void> {
  const statements: D1PreparedStatement[] = upsertS3CompatibleObjectStatements(
    db,
    uniqueObjects([
      ...traces.map(({ payloadObject }) => payloadObject),
      ...stepWrites.map(({ payloadObject }) => payloadObject),
    ]),
  );

  const traceChunkSize = Math.floor(
    (MAX_D1_BOUND_PARAMETERS - 1) / TRACE_PARAMETER_COUNT,
  );
  for (const chunk of chunks(traces, traceChunkSize)) {
    const values = chunk.map(() => `(?, ?, ?,
      (SELECT id FROM project WHERE id = ? AND user_uuid = ?),
      ?, ?, ?, ?, ?, ?, ?)`).join(', ');
    const parameters = chunk.flatMap(({ trace, payloadObject }) => [
      trace.id,
      trace.parentTraceId,
      trace.projectName,
      trace.projectId,
      userId,
      trace.name,
      trace.conversationId,
      stringifyJson(trace.tags),
      payloadObject.objectKey,
      trace.errorInfo,
      trace.startTime,
      trace.lastUpdateTimestamp,
    ]);
    statements.push(db.prepare(`INSERT INTO trace
      (id, parent_trace_id, project_name, project_id, name, conversation_id, tags, payload_object_key, error_info, start_time, last_update_timestamp)
      VALUES ${values}
      ON CONFLICT(id) DO UPDATE SET parent_trace_id = excluded.parent_trace_id,
      project_name = excluded.project_name, project_id = excluded.project_id, name = excluded.name,
      conversation_id = excluded.conversation_id, tags = excluded.tags,
      payload_object_key = excluded.payload_object_key, error_info = excluded.error_info, start_time = excluded.start_time,
      last_update_timestamp = excluded.last_update_timestamp
      WHERE trace.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(...parameters, userId));
  }

  const stepChunkSize = Math.floor(
    (MAX_D1_BOUND_PARAMETERS - 1) / STEP_PARAMETER_COUNT,
  );
  for (const chunk of chunks(stepWrites, stepChunkSize)) {
    const values = chunk.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      (SELECT id FROM project WHERE id = ? AND user_uuid = ?),
      ?, ?)`).join(', ');
    const parameters = chunk.flatMap(({ step, payloadObject }) => [
      step.id,
      step.name,
      step.traceId,
      step.parentStepId,
      step.type,
      stringifyJson(step.tags),
      payloadObject.objectKey,
      step.errorInfo,
      step.model,
      stringifyJson(step.usage),
      step.projectName,
      step.projectId,
      userId,
      step.startTime,
      step.endTime,
    ]);
    statements.push(db.prepare(`INSERT INTO step
      (id, name, trace_id, parent_step_id, type, tags, payload_object_key, error_info, model, usage, project_name, project_id, start_time, end_time)
      VALUES ${values}
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, trace_id = excluded.trace_id,
      parent_step_id = excluded.parent_step_id, type = excluded.type, tags = excluded.tags,
      payload_object_key = excluded.payload_object_key, error_info = excluded.error_info,
      model = excluded.model, usage = excluded.usage, project_name = excluded.project_name,
      project_id = excluded.project_id, start_time = excluded.start_time, end_time = excluded.end_time
      WHERE step.project_id IN (SELECT id FROM project WHERE user_uuid = ?)`)
      .bind(...parameters, userId));
  }

  const stepMetaChunkSize = Math.floor(
    (MAX_D1_BOUND_PARAMETERS - 1) / STEP_META_PARAMETER_COUNT,
  );
  for (const chunk of chunks(stepWrites, stepMetaChunkSize)) {
    const incomingRows = chunk.map((_, index) => index === 0
      ? 'SELECT ? AS id, ? AS metadata, ? AS cost, ? AS cost_units'
      : 'UNION ALL SELECT ?, ?, ?, ?').join('\n');
    const parameters = chunk.flatMap(({ step, metadata, cost }) => [
      step.id,
      stringifyJson(metadata),
      cost,
      toCostUnits(cost),
    ]);
    statements.push(db.prepare(`INSERT INTO step_meta (id, metadata, cost, cost_units)
      SELECT incoming.id, incoming.metadata, incoming.cost, incoming.cost_units
      FROM (${incomingRows}) AS incoming
      INNER JOIN step ON step.id = incoming.id
      INNER JOIN project ON project.id = step.project_id
      WHERE project.user_uuid = ?
      ON CONFLICT(id) DO UPDATE SET metadata = excluded.metadata,
      cost = excluded.cost, cost_units = excluded.cost_units`)
      .bind(...parameters, userId));
  }

  const uniqueProjectIds = [...new Set(projectIds)];
  for (const projectIdChunk of chunks(uniqueProjectIds, MAX_D1_BOUND_PARAMETERS - 1)) {
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
      WHERE id IN (${projectIdChunk.map(() => '?').join(', ')})
        AND user_uuid = ?`).bind(...projectIdChunk, userId));
  }

  if (statements.length) await db.batch(statements);
}

function uniqueObjects<T extends { objectKey: string }>(objects: T[]): T[] {
  return [...new Map(objects.map((object) => [object.objectKey, object])).values()];
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < values.length; offset += size) {
    result.push(values.slice(offset, offset + size));
  }
  return result;
}
