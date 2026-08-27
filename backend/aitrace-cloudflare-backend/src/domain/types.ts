import type { Services } from '../services/index.js';

export interface Bindings extends CloudflareBindings {
  MEDIA_BUCKET?: R2Bucket;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OSS_ACCESS_KEY_ID: string;
  OSS_ACCESS_KEY_SECRET: string;
}

export type AppEnv = { Bindings: Bindings; Variables: { services: Services } };
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export interface Usage extends JsonObject {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  candidates_token_count?: number;
  cost?: string | number;
  prompt_tokens_details?: { cached_tokens?: number; audio_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number; audio_tokens?: number };
}

export interface Project {
  id: number;
  userId: string;
  name: string;
  description: string | null;
  strategy: string | null;
  averageDuration: number;
  cost: string;
  createdTimestamp: string;
  lastUpdateTimestamp: string;
}
export type NewProject = Omit<Project, 'id'>;

export interface Trace {
  id: string;
  parentTraceId: string | null;
  projectName: string;
  projectId: number;
  name: string;
  conversationId: string;
  tags: string[];
  payloadObjectKey: string;
  errorInfo: string | null;
  startTime: string;
  lastUpdateTimestamp: string;
}

export type TraceSummary = Omit<Trace, 'payloadObjectKey'> & {
  /** Raw (uncompressed) payload size in bytes, from the referenced S3 object. Null when absent. */
  payloadSize: number | null;
  /** How many steps belong to this trace. */
  stepCount: number;
};

export interface Step {
  id: string;
  parentStepId: string | null;
  name: string;
  traceId: string | null;
  type: string;
  tags: string[];
  payloadObjectKey: string;
  errorInfo: string | null;
  model: string | null;
  usage: Usage | null;
  projectName: string;
  projectId: number;
  startTime: string;
  endTime: string | null;
  cost?: string | null;
}

export type StepSummary = Omit<Step, 'payloadObjectKey'> & {
  /** Raw (uncompressed) payload size in bytes, from the referenced S3 object. Null when absent. */
  payloadSize: number | null;
};

export interface LogRequest extends JsonObject {
  project_name?: string; projectName?: string;
  trace_id?: string | null; traceId?: string | null;
  trace_name?: string; traceName?: string;
  parent_trace_id?: string; parentTraceId?: string;
  conversation_id?: string; conversationId?: string;
  step_id?: string; stepId?: string;
  step_name?: string; stepName?: string;
  parent_step_id?: string; parentStepId?: string;
  step_type?: string; stepType?: string;
  start_time?: string; startTime?: string;
  end_time?: string; endTime?: string;
  last_update_timestamp?: string; lastUpdateTimestamp?: string;
  error_info?: string; errorInfo?: string;
  llm_provider?: string; llmProvider?: string;
  tags?: string[];
  input?: JsonObject | null;
  output?: JsonObject | null;
  model?: string;
  usage?: Usage;
  description?: string;
}

export interface LogTraceTreeRequest extends JsonObject {
  traces: LogRequest[];
  steps: LogRequest[];
}

export interface BatchStepWrite {
  step: Step;
  payloadObject: S3CompatibleObject;
  metadata: JsonObject;
  cost: string;
}

export interface BatchTraceWrite {
  trace: Trace;
  payloadObject: S3CompatibleObject;
}

export interface StepPayload {
  input: JsonObject | null;
  output: JsonObject | null;
}

export interface TracePayload {
  input: JsonObject | null;
  output: JsonObject | null;
}

export interface S3CompatibleObject {
  objectKey: string;
  contentType: string;
  contentEncoding: 'gzip';
  schemaVersion: number;
  rawSizeBytes: number;
  storedSizeBytes: number;
  sha256: string;
  createdAt: string;
  updatedAt: string;
}

export interface User { id: string; username: string; email: string | null; avatar: string | null; registerTime: string }
export interface UserAuth { id: string; userId: string; authType: string; identifier: string; createdAt: string }
export interface ApiKey { id: string; userId: string; key: string; createdTime: string }
export interface StepMeta { id: string; metadata: string; cost: string }
export interface TokenSnapshot { projectId?: number; start_time?: string; startTime?: string; usage: string | Usage }
export interface MediaAsset {
  id: string;
  projectId: number;
  userId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdTime: string;
}
