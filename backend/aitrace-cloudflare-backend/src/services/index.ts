import { LogService } from './log.js';
import { OverviewService, buildSummary, percentageChange } from './overview.js';
import { ProjectService } from './project.js';
import { MediaService } from './media.js';
import type { RepositoryPort } from '../repositories/port.js';
import type { JsonObject, LogRequest, LogTraceTreeRequest } from '../domain/types.js';
import type { PayloadObjectStorage } from '../storage/aliyun-oss.js';

/** Request-scoped facade exposing the business operations used by route handlers. */
export class Services {
  private readonly projectService: ProjectService;
  private readonly logService: LogService;
  private readonly overviewService: OverviewService;
  private readonly mediaService: MediaService;
  constructor(
    readonly repositories: RepositoryPort,
    mediaBucket: R2Bucket | undefined,
    private readonly payloadStorage: PayloadObjectStorage,
  ) {
    this.projectService = new ProjectService(repositories);
    this.logService = new LogService(repositories, this.projectService, payloadStorage);
    this.overviewService = new OverviewService(repositories);
    this.mediaService = new MediaService(repositories, mediaBucket);
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
  /** Records one complete trace-tree snapshot atomically. */
  logTraceTree(userId: string, request: LogTraceTreeRequest) { return this.logService.logTraceTree(userId, request); }
  /** Lists the steps belonging to a trace in execution order. */
  getTracks(userId: string, traceId: string) { return this.repositories.listStepsByTraceForUser(userId, traceId); }
  /** Loads one user-owned step payload from OSS. */
  async getStepPayload(userId: string, stepId: string) {
    const step = await this.repositories.findStepForUser(userId, stepId);
    if (!step) throw new Error('Step not found');
    const object = await this.repositories.findS3CompatibleObject(step.payloadObjectKey);
    if (!object) throw new Error('Step payload metadata not found');
    return this.payloadStorage.loadStep(object);
  }
  /** Loads one user-owned trace payload from OSS. */
  async getTracePayload(userId: string, traceId: string) {
    const trace = await this.repositories.findTraceForUser(userId, traceId);
    if (!trace) throw new Error('Trace not found');
    const object = await this.repositories.findS3CompatibleObject(trace.payloadObjectKey);
    if (!object) throw new Error('Trace payload metadata not found');
    return this.payloadStorage.loadTrace(object);
  }
  /** Builds the dashboard token-usage summary. */
  getSummary(userId: string, today?: Date) { return this.overviewService.getSummary(userId, today); }
  /** Builds the selected dashboard projects' token-usage curve. */
  getTokenCurve(userId: string, windowHours: number, projectIds: number[], today?: Date) {
    return this.overviewService.getTokenCurve(userId, windowHours, projectIds, today);
  }
  /** Stores an image uploaded by the SDK. */
  storeImage(userId: string, projectName: string, file: File) { return this.mediaService.storeImage(userId, projectName, file); }
  /** Reads a dashboard user's tracked image. */
  loadImage(userId: string, mediaId: string) { return this.mediaService.loadImage(userId, mediaId); }
}
export { buildSummary, percentageChange };
