import * as users from './user-repository.js';
import * as projects from './project-repository.js';
import * as traces from './trace-repository.js';
import * as steps from './step-repository.js';

export class Repositories {
  constructor(db) {
    this.db = db;
  }

  findUser(id) { return users.findUser(this.db, id); }
  findUserAuth(identifier) { return users.findUserAuth(this.db, identifier); }
  createUser(user) { return users.createUser(this.db, user); }
  createUserAuth(auth) { return users.createUserAuth(this.db, auth); }
  insertApiKey(apiKey) { return users.insertApiKey(this.db, apiKey); }
  latestApiKey(userId) { return users.latestApiKey(this.db, userId); }
  userIdForApiKey(key) { return users.userIdForApiKey(this.db, key); }

  findProject(userId, name) { return projects.findProject(this.db, userId, name); }
  findProjectById(userId, projectId) { return projects.findProjectById(this.db, userId, projectId); }
  listProjects(userId) { return projects.listProjects(this.db, userId); }
  createProject(project) { return projects.createProject(this.db, project); }
  updateProjectCost(projectId, cost) { return projects.updateProjectCost(this.db, projectId, cost); }
  updateProjectAverageDuration(projectId, averageDuration) { return projects.updateProjectAverageDuration(this.db, projectId, averageDuration); }
  updateProjectDescription(userId, projectId, description) { return projects.updateProjectDescription(this.db, userId, projectId, description); }
  deleteProject(userId, name) { return projects.deleteProject(this.db, userId, name); }

  upsertTrace(trace) { return traces.upsertTrace(this.db, trace); }
  findTrace(traceId) { return traces.findTrace(this.db, traceId); }
  countTraces(projectId) { return traces.countTraces(this.db, projectId); }
  listTraces(projectId, page, pageSize) { return traces.listTraces(this.db, projectId, page, pageSize); }
  deleteTraces(traceIds) { return traces.deleteTraces(this.db, traceIds); }

  upsertStep(step) { return steps.upsertStep(this.db, step); }
  findStep(stepId) { return steps.findStep(this.db, stepId); }
  listSteps(projectId, page, pageSize) { return steps.listSteps(this.db, projectId, page, pageSize); }
  listStepsByTrace(traceId) { return steps.listStepsByTrace(this.db, traceId); }
  deleteSteps(stepIds) { return steps.deleteSteps(this.db, stepIds); }
  findStepMeta(stepId) { return steps.findStepMeta(this.db, stepId); }
  upsertStepMeta(stepId, metadata, cost) { return steps.upsertStepMeta(this.db, stepId, metadata, cost); }
  tokenSnapshots(projectIds) { return steps.tokenSnapshots(this.db, projectIds); }
}
