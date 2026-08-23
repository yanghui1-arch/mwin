import type { NewProject, Project } from '../domain/types.js';

/** Maps persisted project fields to the dashboard response shape. */
export function toProjectInfo(project: Project) {
  return { projectId: project.id, projectName: project.name, description: project.description, averageDuration: project.averageDuration,
    cost: project.cost, createdTimestamp: project.createdTimestamp, lastUpdateTimestamp: project.lastUpdateTimestamp };
}
/** Creates the shared initial values for new projects. */
export function projectTemplate(userId: string, name: string, description: string | null, cost: string, timestamp: string): NewProject {
  return { userId, name, description, strategy: null, averageDuration: 0, cost, createdTimestamp: timestamp, lastUpdateTimestamp: timestamp };
}
