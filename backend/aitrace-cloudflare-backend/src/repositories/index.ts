import * as users from './user.js';
import * as projects from './project.js';
import * as traces from './trace.js';
import * as steps from './step.js';
import type { RepositoryPort } from './port.js';
import type { ApiKey, JsonObject, NewProject, Step, Trace, User, UserAuth } from '../domain/types.js';

export class Repositories implements RepositoryPort {
  constructor(private readonly db: D1Database) {}
  findUser(id: string) { return users.findUser(this.db, id); }
  findUserAuth(identifier: string) { return users.findUserAuth(this.db, identifier); }
  createUser(user: User) { return users.createUser(this.db, user); }
  createUserAuth(auth: UserAuth) { return users.createUserAuth(this.db, auth); }
  insertApiKey(apiKey: ApiKey) { return users.insertApiKey(this.db, apiKey); }
  latestApiKey(userId: string) { return users.latestApiKey(this.db, userId); }
  userIdForApiKey(key: string) { return users.userIdForApiKey(this.db, key); }
  findProject(userId: string, name: string) { return projects.findProject(this.db, userId, name); }
  findProjectById(userId: string, projectId: number) { return projects.findProjectById(this.db, userId, projectId); }
  listProjects(userId: string) { return projects.listProjects(this.db, userId); }
  createProject(project: NewProject) { return projects.createProject(this.db, project); }
  updateProjectCost(projectId: number, cost: string) { return projects.updateProjectCost(this.db, projectId, cost); }
  updateProjectAverageDuration(projectId: number, averageDuration: number) { return projects.updateProjectAverageDuration(this.db, projectId, averageDuration); }
  updateProjectDescription(userId: string, projectId: number, description: string) { return projects.updateProjectDescription(this.db, userId, projectId, description); }
  deleteProject(userId: string, name: string) { return projects.deleteProject(this.db, userId, name); }
  upsertTrace(trace: Trace) { return traces.upsertTrace(this.db, trace); }
  findTrace(traceId: string) { return traces.findTrace(this.db, traceId); }
  countTraces(projectId: number) { return traces.countTraces(this.db, projectId); }
  listTraces(projectId: number, page: number, pageSize: number) { return traces.listTraces(this.db, projectId, page, pageSize); }
  deleteTraces(traceIds: string[]) { return traces.deleteTraces(this.db, traceIds); }
  upsertStep(step: Step) { return steps.upsertStep(this.db, step); }
  findStep(stepId: string) { return steps.findStep(this.db, stepId); }
  listSteps(projectId: number, page: number, pageSize: number) { return steps.listSteps(this.db, projectId, page, pageSize); }
  listStepsByTrace(traceId: string) { return steps.listStepsByTrace(this.db, traceId); }
  deleteSteps(stepIds: string[]) { return steps.deleteSteps(this.db, stepIds); }
  findStepMeta(stepId: string) { return steps.findStepMeta(this.db, stepId); }
  upsertStepMeta(stepId: string, metadata: JsonObject, cost: string) { return steps.upsertStepMeta(this.db, stepId, metadata, cost); }
  tokenSnapshots(projectIds: number[]) { return steps.tokenSnapshots(this.db, projectIds); }
}
