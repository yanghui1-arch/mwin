import type { ApiKey, BatchStepWrite, JsonObject, MediaAsset, NewProject, Project, Step, StepMeta, TokenSnapshot, Trace, User, UserAuth } from '../domain/types.js';

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

  upsertTraceForUser(userId: string, trace: Trace): Promise<void>;
  upsertBatchForUser(userId: string, traces: Trace[], steps: BatchStepWrite[], projectIds: number[]): Promise<void>;
  findTrace(traceId: string): Promise<Trace | null>;
  countTraces(projectId: number): Promise<number>;
  listTraces(projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Trace[] }>;
  deleteTracesForUser(userId: string, traceIds: string[]): Promise<string[]>;

  upsertStepForUser(userId: string, step: Step, metadata: JsonObject, cost: string): Promise<void>;
  findStepForUser(userId: string, stepId: string): Promise<Step | null>;
  listSteps(projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Step[] }>;
  listStepsByTraceForUser(userId: string, traceId: string): Promise<Step[]>;
  deleteStepsForUser(userId: string, stepIds: string[]): Promise<string[]>;
  findStepMetaForUser(userId: string, stepId: string): Promise<StepMeta | null>;
  tokenSnapshots(projectIds: number[]): Promise<TokenSnapshot[]>;

  createMediaAsset(asset: MediaAsset): Promise<MediaAsset>;
  findMediaAssetForUser(userId: string, mediaId: string): Promise<MediaAsset | null>;
}
