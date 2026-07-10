import { parseJson } from './utils.js';

export function projectFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_uuid,
    name: row.name,
    description: row.description,
    strategy: row.strategy,
    averageDuration: row.avg_duration,
    cost: row.cost,
    createdTimestamp: row.created_timestamp,
    lastUpdateTimestamp: row.last_update_timestamp,
  };
}

export function traceFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectName: row.project_name,
    projectId: row.project_id,
    name: row.name,
    conversationId: row.conversation_id,
    tags: parseJson(row.tags, []),
    input: parseJson(row.input),
    output: parseJson(row.output),
    errorInfo: row.error_info,
    startTime: row.start_time,
    lastUpdateTimestamp: row.last_update_timestamp,
  };
}

export function stepFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentStepId: row.parent_step_id,
    name: row.name,
    traceId: row.trace_id,
    type: row.type,
    tags: parseJson(row.tags, []),
    input: parseJson(row.input),
    output: parseJson(row.output),
    errorInfo: row.error_info,
    model: row.model,
    usage: parseJson(row.usage),
    projectName: row.project_name,
    projectId: row.project_id,
    startTime: row.start_time,
    endTime: row.end_time,
    cost: row.cost,
  };
}
