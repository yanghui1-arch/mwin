import { toDecimalString } from './decimal.js';
import { projectTemplate, toProjectInfo } from './service-mappers.js';
import { concealApiKey, newId, nowIso, pageCount, sha256Hex } from './utils.js';

export class ProjectService {
  constructor(repositories) {
    this.repositories = repositories;
  }

  async generateAndStoreApiKey(userId) {
    const secret = await sha256Hex(`${userId}:${newId()}:${Date.now()}`);
    const apiKey = `mwin_${secret}`;
    await this.repositories.insertApiKey({ id: newId(), userId, key: apiKey, createdTime: nowIso() });
    return apiKey;
  }

  async getConcealedApiKey(userId) {
    const apiKey = await this.repositories.latestApiKey(userId);
    return apiKey ? concealApiKey(apiKey) : null;
  }

  getCompleteApiKey(userId) { return this.repositories.latestApiKey(userId); }
  userIdForApiKey(apiKey) { return this.repositories.userIdForApiKey(apiKey); }

  async createProject(userId, request) {
    const name = request.project_name ?? request.projectName;
    const description = request.project_description ?? request.projectDescription ?? null;
    return (await this.repositories.createProject(projectTemplate(userId, name, description, toDecimalString(0), nowIso()))).name;
  }

  async ensureProject(userId, projectName) {
    const existing = await this.repositories.findProject(userId, projectName);
    return existing ?? this.repositories.createProject(projectTemplate(userId, projectName, null, toDecimalString(0), nowIso()));
  }

  async listProjects(userId) {
    return (await this.repositories.listProjects(userId)).map(toProjectInfo);
  }

  async updateProject(userId, projectId, description) {
    return toProjectInfo(await this.repositories.updateProjectDescription(userId, projectId, description));
  }

  async deleteProject(userId, projectName) {
    await this.repositories.deleteProject(userId, projectName);
    return 'Project deleted successfully';
  }

  async getSteps(userId, projectName, page, pageSize) {
    const project = await this.repositories.findProject(userId, projectName);
    if (!project) return { pageCount: 0, data: [] };
    const result = await this.repositories.listSteps(project.id, page, pageSize);
    return { pageCount: pageCount(result.total, pageSize), data: result.data };
  }

  async getTraces(userId, projectName, page, pageSize) {
    const project = await this.repositories.findProject(userId, projectName);
    if (!project) return { pageCount: 0, data: [] };
    const result = await this.repositories.listTraces(project.id, page, pageSize);
    return { pageCount: pageCount(result.total, pageSize), data: result.data };
  }
}
