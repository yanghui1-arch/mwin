import { toDecimalString } from '../lib/decimal.js';
import type { RepositoryPort } from '../repositories/port.js';
import { projectTemplate, toProjectInfo } from './mappers.js';
import type { JsonObject, Project } from '../domain/types.js';
import { concealApiKey, newId, nowIso, pageCount } from '../lib/utils.js';

export class ProjectService {
  constructor(private readonly repositories: RepositoryPort) {}
  /** Creates a new API key and stores it as the user's latest credential. */
  async generateAndStoreApiKey(userId: string): Promise<string> {
    const apiKey = `at-${newId().replace(/-/g, '')}`;
    await this.repositories.deleteApiKeys(userId);
    await this.repositories.insertApiKey({ id: newId(), userId, key: apiKey, createdTime: nowIso() });
    return apiKey;
  }
  /** Returns the latest API key with its middle characters masked. */
  async getConcealedApiKey(userId: string): Promise<string | null> {
    const key = await this.repositories.latestApiKey(userId); return key ? concealApiKey(key) : null;
  }
  /** Returns the complete latest API key for an authenticated dashboard user. */
  getCompleteApiKey(userId: string) { return this.repositories.latestApiKey(userId); }
  /** Resolves an API key to its owning user. */
  userIdForApiKey(apiKey: string) { return this.repositories.userIdForApiKey(apiKey); }
  /** Creates a project from either snake_case or camelCase dashboard input. */
  async createProject(userId: string, request: JsonObject): Promise<string> {
    const name = stringField(request.project_name ?? request.projectName, 'project name');
    const description = optionalString(request.project_description ?? request.projectDescription);
    return (await this.repositories.createProject(projectTemplate(userId, name, description, toDecimalString(0), nowIso()))).name;
  }
  /** Finds a project or creates it when telemetry arrives before dashboard setup. */
  async ensureProject(userId: string, projectName: string): Promise<Project> {
    return await this.repositories.findProject(userId, projectName)
      ?? this.repositories.createProject(projectTemplate(userId, projectName, null, toDecimalString(0), nowIso()));
  }
  /** Lists projects in the dashboard response shape. */
  async listProjects(userId: string) { return (await this.repositories.listProjects(userId)).map(toProjectInfo); }
  /** Updates a project description and fails when the user does not own the project. */
  async updateProject(userId: string, projectId: number, description: string) {
    const project = await this.repositories.updateProjectDescription(userId, projectId, description);
    if (!project) throw new Error('Project not found');
    return toProjectInfo(project);
  }
  /** Deletes a project by its user-scoped name. */
  async deleteProject(userId: string, projectName: string): Promise<string> {
    await this.repositories.deleteProject(userId, projectName); return 'Project deleted successfully';
  }
  /** Returns one page of steps, or an empty page when the project is absent. */
  async getSteps(userId: string, projectName: string, page: number, pageSize: number) {
    const project = await this.repositories.findProject(userId, projectName);
    if (!project) return { pageCount: 0, data: [] };
    const result = await this.repositories.listSteps(project.id, page, pageSize);
    return { pageCount: pageCount(result.total, pageSize), data: result.data };
  }
  /** Returns one page of traces, or an empty page when the project is absent. */
  async getTraces(userId: string, projectName: string, page: number, pageSize: number) {
    const project = await this.repositories.findProject(userId, projectName);
    if (!project) return { pageCount: 0, data: [] };
    const result = await this.repositories.listTraces(project.id, page, pageSize);
    return { pageCount: pageCount(result.total, pageSize), data: result.data };
  }
}
/** Validates required string fields shared by snake_case and camelCase requests. */
export function stringField(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${name}`); return value;
}
function optionalString(value: unknown): string | null { return typeof value === 'string' ? value : null; }
