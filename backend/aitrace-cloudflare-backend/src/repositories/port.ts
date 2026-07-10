import type { ApiKey, JsonObject, NewProject, Project, Step, StepMeta, TokenSnapshot, Trace, User, UserAuth } from '../domain/types.js';

/** Persistence operations required by the application services. */
export interface RepositoryPort {
  findUser(id: string): Promise<User | null>;
  findUserAuth(identifier: string): Promise<{ user_uuid: string } | null>;
  createUser(user: User): Promise<User>;
  createUserAuth(auth: UserAuth): Promise<void>;
  insertApiKey(apiKey: ApiKey): Promise<ApiKey>;
  latestApiKey(userId: string): Promise<string | null>;
  userIdForApiKey(key: string): Promise<string | null>;
  findProject(userId: string, name: string): Promise<Project | null>;
  listProjects(userId: string): Promise<Project[]>;
  createProject(project: NewProject): Promise<Project>;
  updateProjectCost(projectId: number, cost: string): Promise<void>;
  updateProjectAverageDuration(projectId: number, averageDuration: number): Promise<void>;
  updateProjectDescription(userId: string, projectId: number, description: string): Promise<Project | null>;
  deleteProject(userId: string, name: string): Promise<void>;
  upsertTrace(trace: Trace): Promise<void>;
  findTrace(traceId: string): Promise<Trace | null>;
  countTraces(projectId: number): Promise<number>;
  listTraces(projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Trace[] }>;
  deleteTraces(traceIds: string[]): Promise<string[]>;
  upsertStep(step: Step): Promise<void>;
  findStep(stepId: string): Promise<Step | null>;
  listSteps(projectId: number, page: number, pageSize: number): Promise<{ total: number; data: Step[] }>;
  listStepsByTrace(traceId: string): Promise<Step[]>;
  deleteSteps(stepIds: string[]): Promise<string[]>;
  findStepMeta(stepId: string): Promise<StepMeta | null>;
  upsertStepMeta(stepId: string, metadata: JsonObject, cost: string): Promise<StepMeta>;
  tokenSnapshots(projectIds: number[]): Promise<TokenSnapshot[]>;
}
