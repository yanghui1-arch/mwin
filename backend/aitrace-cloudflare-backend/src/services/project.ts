import { toDecimalString } from './decimal.js';
import type { RepositoryPort } from './repository-port.js';
import { projectTemplate, toProjectInfo } from './service-mappers.js';
import type { JsonObject, Project } from './types.js';
import { concealApiKey, newId, nowIso, pageCount, sha256Hex } from './utils.js';

export class ProjectService {
  constructor(private readonly repositories: RepositoryPort) {}
  async generateAndStoreApiKey(userId: string): Promise<string> {
    const apiKey = `mwin_${await sha256Hex(`${userId}:${newId()}:${Date.now()}`)}`;
    await this.repositories.insertApiKey({ id: newId(), userId, key: apiKey, createdTime: nowIso() });
    return apiKey;
  }
  async getConcealedApiKey(userId: string): Promise<string | null> {
    const key = await this.repositories.latestApiKey(userId); return key ? concealApiKey(key) : null;
  }
  getCompleteApiKey(userId: string) { return this.repositories.latestApiKey(userId); }
  userIdForApiKey(apiKey: string) { return this.repositories.userIdForApiKey(apiKey); }
  async createProject(userId: string, request: JsonObject): Promise<string> {
    const name = stringField(request.project_name ?? request.projectName, 'project name');
    const description = optionalString(request.project_description ?? request.projectDescription);
    return (await this.repositories.createProject(projectTemplate(userId, name, description, toDecimalString(0), nowIso()))).name;
  }
  async ensureProject(userId: string, projectName: string): Promise<Project> {
    return await this.repositories.findProject(userId, projectName)
      ?? this.repositories.createProject(projectTemplate(userId, projectName, null, toDecimalString(0), nowIso()));
  }
  async listProjects(userId: string) { return (await this.repositories.listProjects(userId)).map(toProjectInfo); }
  async updateProject(userId: string, projectId: number, description: string) {
    const project = await this.repositories.updateProjectDescription(userId, projectId, description);
    if (!project) throw new Error('Project not found');
    return toProjectInfo(project);
  }
  async deleteProject(userId: string, projectName: string): Promise<string> {
    await this.repositories.deleteProject(userId, projectName); return 'Project deleted successfully';
  }
  async getSteps(userId: string, projectName: string, page: number, pageSize: number) {
    const project = await this.repositories.findProject(userId, projectName);
    if (!project) return { pageCount: 0, data: [] };
    const result = await this.repositories.listSteps(project.id, page, pageSize);
    return { pageCount: pageCount(result.total, pageSize), data: result.data };
  }
  async getTraces(userId: string, projectName: string, page: number, pageSize: number) {
    const project = await this.repositories.findProject(userId, projectName);
    if (!project) return { pageCount: 0, data: [] };
    const result = await this.repositories.listTraces(project.id, page, pageSize);
    return { pageCount: pageCount(result.total, pageSize), data: result.data };
  }
}
export function stringField(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${name}`); return value;
}
function optionalString(value: unknown): string | null { return typeof value === 'string' ? value : null; }
