import type { JsonObject, Project, Step, Trace, Usage } from '../domain/types.js';
import { parseJson } from '../lib/utils.js';

export interface ProjectRow { id: number; user_uuid: string; name: string; description: string | null; strategy: string | null; avg_duration: number; cost: string; created_timestamp: string; last_update_timestamp: string }
export interface TraceRow { id: string; project_name: string; project_id: number; name: string; conversation_id: string; tags: string; input: string | null; output: string | null; error_info: string | null; start_time: string; last_update_timestamp: string }
export interface StepRow { id: string; parent_step_id: string | null; name: string; trace_id: string; type: string; tags: string; input: string | null; output: string | null; error_info: string | null; model: string | null; usage: string | null; project_name: string; project_id: number; start_time: string; end_time: string | null; cost?: string | null }

/** Converts a D1 project row to the domain naming convention. */
export function projectFromRow(row: ProjectRow | null): Project | null {
  if (!row) return null;
  return { id: row.id, userId: row.user_uuid, name: row.name, description: row.description, strategy: row.strategy,
    averageDuration: row.avg_duration, cost: row.cost, createdTimestamp: row.created_timestamp, lastUpdateTimestamp: row.last_update_timestamp };
}

/** Converts a D1 trace row and parses its JSON columns. */
export function traceFromRow(row: TraceRow | null): Trace | null {
  if (!row) return null;
  return { id: row.id, projectName: row.project_name, projectId: row.project_id, name: row.name,
    conversationId: row.conversation_id, tags: parseJson<string[]>(row.tags, []), input: parseJson<JsonObject>(row.input),
    output: parseJson<JsonObject>(row.output), errorInfo: row.error_info, startTime: row.start_time, lastUpdateTimestamp: row.last_update_timestamp };
}

/** Converts a D1 step row and parses its JSON columns. */
export function stepFromRow(row: StepRow | null): Step | null {
  if (!row) return null;
  return { id: row.id, parentStepId: row.parent_step_id, name: row.name, traceId: row.trace_id, type: row.type,
    tags: parseJson<string[]>(row.tags, []), input: parseJson<JsonObject>(row.input), output: parseJson<JsonObject>(row.output),
    errorInfo: row.error_info, model: row.model, usage: parseJson<Usage>(row.usage), projectName: row.project_name,
    projectId: row.project_id, startTime: row.start_time, endTime: row.end_time, cost: row.cost };
}
