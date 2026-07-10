import { LogService } from './log.js';
import { OverviewService, buildSummary, percentageChange } from './overview.js';
import { ProjectService } from './project.js';
import type { RepositoryPort } from '../repositories/port.js';
import type { JsonObject, LogRequest } from '../domain/types.js';

export class Services {
  private readonly projectService: ProjectService;
  private readonly logService: LogService;
  private readonly overviewService: OverviewService;
  constructor(readonly repositories: RepositoryPort) {
    this.projectService = new ProjectService(repositories);
    this.logService = new LogService(repositories, this.projectService);
    this.overviewService = new OverviewService(repositories);
  }
  generateAndStoreApiKey(userId: string) { return this.projectService.generateAndStoreApiKey(userId); }
  getConcealedApiKey(userId: string) { return this.projectService.getConcealedApiKey(userId); }
  getCompleteApiKey(userId: string) { return this.projectService.getCompleteApiKey(userId); }
  userIdForApiKey(apiKey: string) { return this.projectService.userIdForApiKey(apiKey); }
  createProject(userId: string, request: JsonObject) { return this.projectService.createProject(userId, request); }
  listProjects(userId: string) { return this.projectService.listProjects(userId); }
  updateProject(userId: string, projectId: number, description: string) { return this.projectService.updateProject(userId, projectId, description); }
  deleteProject(userId: string, projectName: string) { return this.projectService.deleteProject(userId, projectName); }
  getSteps(userId: string, projectName: string, page: number, pageSize: number) { return this.projectService.getSteps(userId, projectName, page, pageSize); }
  getTraces(userId: string, projectName: string, page: number, pageSize: number) { return this.projectService.getTraces(userId, projectName, page, pageSize); }
  logTrace(userId: string, request: LogRequest) { return this.logService.logTrace(userId, request); }
  logStep(userId: string, request: LogRequest) { return this.logService.logStep(userId, request); }
  getTracks(traceId: string) { return this.repositories.listStepsByTrace(traceId); }
  getSummary(userId: string, today?: Date) { return this.overviewService.getSummary(userId, today); }
}
export { buildSummary, percentageChange };
