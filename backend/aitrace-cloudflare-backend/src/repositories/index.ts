/** Binds the request D1 database to Drizzle-backed repositories and atomic D1 mutations. */
import { createDatabase, type AppDatabase } from '../db/index.js';
import * as users from './user.js';
import * as projects from './project.js';
import * as traces from './trace.js';
import * as steps from './step.js';
import type { RepositoryPort } from './port.js';
import type { ApiKey, JsonObject, NewProject, Step, Trace, User, UserAuth } from '../domain/types.js';

export class Repositories implements RepositoryPort {
  private readonly db: AppDatabase;

  constructor(private readonly rawDb: D1Database) {
    this.db = createDatabase(rawDb);
  }

  findUser(id: string) { return users.findUser(this.db, id); }
  findUserAuth(identifier: string) { return users.findUserAuth(this.db, identifier); }
  createUserWithAuthAndApiKey(user: User, auth: UserAuth, apiKey: ApiKey) {
    return users.createUserWithAuthAndApiKey(this.db, user, auth, apiKey);
  }
  rotateApiKey(apiKey: ApiKey) { return users.rotateApiKey(this.db, apiKey); }
  latestApiKey(userId: string) { return users.latestApiKey(this.db, userId); }
  userIdForApiKey(key: string) { return users.userIdForApiKey(this.db, key); }

  findProject(userId: string, name: string) { return projects.findProject(this.db, userId, name); }
  findProjectById(userId: string, projectId: number) { return projects.findProjectById(this.db, userId, projectId); }
  listProjects(userId: string) { return projects.listProjects(this.db, userId); }
  createProject(project: NewProject) { return projects.createProject(this.db, project); }
  ensureProject(project: NewProject) { return projects.ensureProject(this.db, project); }
  updateProjectCost(projectId: number, cost: string) { return projects.updateProjectCost(this.db, projectId, cost); }
  updateProjectAverageDuration(projectId: number, averageDuration: number) {
    return projects.updateProjectAverageDuration(this.db, projectId, averageDuration);
  }
  updateProjectDescription(userId: string, projectId: number, description: string) {
    return projects.updateProjectDescription(this.db, userId, projectId, description);
  }
  deleteProject(userId: string, name: string) { return projects.deleteProject(this.db, userId, name); }

  upsertTraceForUser(userId: string, trace: Trace) { return traces.upsertTraceForUser(this.rawDb, userId, trace); }
  findTrace(traceId: string) { return traces.findTrace(this.rawDb, traceId); }
  countTraces(projectId: number) { return traces.countTraces(this.rawDb, projectId); }
  listTraces(projectId: number, page: number, pageSize: number) {
    return traces.listTraces(this.rawDb, projectId, page, pageSize);
  }
  deleteTracesForUser(userId: string, traceIds: string[]) {
    return traces.deleteTracesForUser(this.rawDb, userId, traceIds);
  }

  upsertStepForUser(userId: string, step: Step, metadata: JsonObject, cost: string) {
    return steps.upsertStepForUser(this.rawDb, userId, step, metadata, cost);
  }
  findStepForUser(userId: string, stepId: string) { return steps.findStepForUser(this.rawDb, userId, stepId); }
  listSteps(projectId: number, page: number, pageSize: number) {
    return steps.listSteps(this.rawDb, projectId, page, pageSize);
  }
  listStepsByTraceForUser(userId: string, traceId: string) {
    return steps.listStepsByTraceForUser(this.rawDb, userId, traceId);
  }
  deleteStepsForUser(userId: string, stepIds: string[]) {
    return steps.deleteStepsForUser(this.rawDb, userId, stepIds);
  }
  findStepMetaForUser(userId: string, stepId: string) {
    return steps.findStepMetaForUser(this.rawDb, userId, stepId);
  }
  tokenSnapshots(projectIds: number[]) { return steps.tokenSnapshots(this.rawDb, projectIds); }
}
