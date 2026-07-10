import { LogService } from './log.js';
import { OverviewService, buildSummary, percentageChange } from './overview.js';
import { ProjectService } from './project.js';
import type { RepositoryPort } from '../repositories/port.js';
import type { JsonObject, LogRequest } from '../domain/types.js';

/** Request-scoped facade exposing the business operations used by route handlers. */
export class Services {
  private readonly projectService: ProjectService;
  private readonly logService: LogService;
  private readonly overviewService: OverviewService;
  constructor(readonly repositories: RepositoryPort) {
    this.projectService = new ProjectService(repositories);
    this.logService = new LogService(repositories, this.projectService);
    this.overviewService = new OverviewService(repositories);
  }
  /** Rotates the user's telemetry credential. */
  generateAndStoreApiKey(userId: string) { return this.projectService.generateAndStoreApiKey(userId); }
  /** Reads the masked telemetry credential for dashboard display. */
  getConcealedApiKey(userId: string) { return this.projectService.getConcealedApiKey(userId); }
  /** Reads the full telemetry credential for an explicit reveal request. */
  getCompleteApiKey(userId: string) { return this.projectService.getCompleteApiKey(userId); }
  /** Resolves telemetry credentials during API authentication. */
  userIdForApiKey(apiKey: string) { return this.projectService.userIdForApiKey(apiKey); }
  /** Creates a dashboard project for the authenticated user. */
  createProject(userId: string, request: JsonObject) { return this.projectService.createProject(userId, request); }
  /** Lists dashboard projects for the authenticated user. */
  listProjects(userId: string) { return this.projectService.listProjects(userId); }
  /** Updates a user-owned project description. */
  updateProject(userId: string, projectId: number, description: string) { return this.projectService.updateProject(userId, projectId, description); }
  /** Deletes a user-owned project by name. */
  deleteProject(userId: string, projectName: string) { return this.projectService.deleteProject(userId, projectName); }
  /** Reads a page of steps for a user-owned project. */
  getSteps(userId: string, projectName: string, page: number, pageSize: number) { return this.projectService.getSteps(userId, projectName, page, pageSize); }
  /** Reads a page of traces for a user-owned project. */
  getTraces(userId: string, projectName: string, page: number, pageSize: number) { return this.projectService.getTraces(userId, projectName, page, pageSize); }
  /** Records telemetry for one trace. */
  logTrace(userId: string, request: LogRequest) { return this.logService.logTrace(userId, request); }
  /** Records telemetry and billing data for one step. */
  logStep(userId: string, request: LogRequest) { return this.logService.logStep(userId, request); }
  /** Lists the steps belonging to a trace in execution order. */
  getTracks(traceId: string) { return this.repositories.listStepsByTrace(traceId); }
  /** Builds the dashboard token-usage summary. */
  getSummary(userId: string, today?: Date) { return this.overviewService.getSummary(userId, today); }
}
export { buildSummary, percentageChange };
