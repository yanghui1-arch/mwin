import type { ApiKey, BatchStepWrite, BatchTraceWrite, JsonObject, MediaAsset, NewProject, Project, S3CompatibleObject, Step, StepMeta, StepSummary, TokenSnapshot, Trace, TraceSummary, User, UserAuth } from '../domain/types.js';

/** Persistence operations required by the application services. */
export interface RepositoryPort {
  findUser(id: string): Promise<User | null>;
  findUserAuth(identifier: string): Promise<{ user_uuid: string } | null>;
  createUserWithAuthAndApiKey(user: User, auth: UserAuth, apiKey: ApiKey): Promise<void>;
  rotateApiKey(apiKey: ApiKey): Promise<ApiKey>;
  latestApiKey(userId: string): Promise<string | null>;
  userIdForApiKey(key: string): Promise<string | null>;

  findProject(userId: string, name: string): Promise<Project | null>;
  findProjectById(userId: string, projectId: number): Promise<Project | null>;
  listProjects(userId: string): Promise<Project[]>;
  createProject(project: NewProject): Promise<Project>;
  ensureProject(project: NewProject): Promise<Project>;
  updateProjectCost(projectId: number, cost: string): Promise<void>;
  updateProjectAverageDuration(projectId: number, averageDuration: number): Promise<void>;
  updateProjectDescription(userId: string, projectId: number, description: string): Promise<Project | null>;
  deleteProject(userId: string, name: string): Promise<void>;

  upsertTraceForUser(userId: string, trace: Trace, payloadObject: S3CompatibleObject): Promise<void>;
  upsertBatchForUser(userId: string, traces: BatchTraceWrite[], steps: BatchStepWrite[], projectIds: number[]): Promise<void>;
  findTrace(traceId: string): Promise<Trace | null>;
  findTraceForUser(userId: string, traceId: string): Promise<Trace | null>;
  countTraces(projectId: number): Promise<number>;
  listTraces(projectId: number, page: number, pageSize: number): Promise<{ total: number; data: TraceSummary[] }>;
  deleteTracesForUser(userId: string, traceIds: string[]): Promise<string[]>;

  upsertStepForUser(userId: string, step: Step, payloadObject: S3CompatibleObject, metadata: JsonObject, cost: string): Promise<void>;
  findStepForUser(userId: string, stepId: string): Promise<Step | null>;
  listSteps(projectId: number, page: number, pageSize: number): Promise<{ total: number; data: StepSummary[] }>;
  listStepsByTraceForUser(userId: string, traceId: string): Promise<StepSummary[]>;
  deleteStepsForUser(userId: string, stepIds: string[]): Promise<string[]>;
  findStepMetaForUser(userId: string, stepId: string): Promise<StepMeta | null>;
  tokenSnapshots(projectIds: number[]): Promise<TokenSnapshot[]>;
  findS3CompatibleObject(objectKey: string): Promise<S3CompatibleObject | null>;

  createMediaAsset(asset: MediaAsset): Promise<MediaAsset>;
  findMediaAssetForUser(userId: string, mediaId: string): Promise<MediaAsset | null>;
}
