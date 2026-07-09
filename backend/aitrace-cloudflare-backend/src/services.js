import { LogService } from './log-service.js';
import { OverviewService, buildSummary, percentageChange } from './overview-service.js';
import { ProjectService } from './project-service.js';

export class Services {
  constructor(repositories) {
    this.repositories = repositories;
    this.projectService = new ProjectService(repositories);
    this.logService = new LogService(repositories, this.projectService);
    this.overviewService = new OverviewService(repositories);
  }

  generateAndStoreApiKey(userId) { return this.projectService.generateAndStoreApiKey(userId); }
  getConcealedApiKey(userId) { return this.projectService.getConcealedApiKey(userId); }
  getCompleteApiKey(userId) { return this.projectService.getCompleteApiKey(userId); }
  userIdForApiKey(apiKey) { return this.projectService.userIdForApiKey(apiKey); }
  createProject(userId, request) { return this.projectService.createProject(userId, request); }
  ensureProject(userId, projectName) { return this.projectService.ensureProject(userId, projectName); }
  listProjects(userId) { return this.projectService.listProjects(userId); }
  updateProject(userId, projectId, description) { return this.projectService.updateProject(userId, projectId, description); }
  deleteProject(userId, projectName) { return this.projectService.deleteProject(userId, projectName); }
  getSteps(userId, projectName, page, pageSize) { return this.projectService.getSteps(userId, projectName, page, pageSize); }
  getTraces(userId, projectName, page, pageSize) { return this.projectService.getTraces(userId, projectName, page, pageSize); }

  logTrace(userId, request) { return this.logService.logTrace(userId, request); }
  logStep(userId, request) { return this.logService.logStep(userId, request); }
  getTracks(traceId) { return this.repositories.listStepsByTrace(traceId); }
  getSummary(userId, today) { return this.overviewService.getSummary(userId, today); }
}

export { buildSummary, percentageChange };
