/** D1 operations for user-owned projects and project aggregates. */
import { projectFromRow, type ProjectRow } from './mappers.js';
import type { NewProject, Project } from '../domain/types.js';

export async function findProject(db: D1Database, userId: string, name: string): Promise<Project | null> {
  return projectFromRow(await db.prepare('SELECT * FROM project WHERE user_uuid = ? AND name = ?').bind(userId, name).first<ProjectRow>());
}
export async function findProjectById(db: D1Database, userId: string, projectId: number): Promise<Project | null> {
  return projectFromRow(await db.prepare('SELECT * FROM project WHERE user_uuid = ? AND id = ?').bind(userId, projectId).first<ProjectRow>());
}
export async function listProjects(db: D1Database, userId: string): Promise<Project[]> {
  const { results } = await db.prepare('SELECT * FROM project WHERE user_uuid = ? ORDER BY last_update_timestamp DESC').bind(userId).all<ProjectRow>();
  return results.map((row) => projectFromRow(row)!);
}
export async function createProject(db: D1Database, project: NewProject): Promise<Project> {
  const result = await db.prepare('INSERT INTO project (user_uuid, name, description, strategy, avg_duration, cost, created_timestamp, last_update_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(project.userId, project.name, project.description, project.strategy, project.averageDuration, project.cost, project.createdTimestamp, project.lastUpdateTimestamp).run();
  return { ...project, id: Number(result.meta.last_row_id) };
}

/** Resolves concurrent first telemetry writes without creating duplicate projects. */
export async function ensureProject(db: D1Database, project: NewProject): Promise<Project> {
  const statements = [
    db.prepare(`INSERT INTO project (user_uuid, name, description, strategy, avg_duration, cost, created_timestamp, last_update_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_uuid, name) DO NOTHING`)
      .bind(project.userId, project.name, project.description, project.strategy, project.averageDuration, project.cost, project.createdTimestamp, project.lastUpdateTimestamp),
    db.prepare('SELECT * FROM project WHERE user_uuid = ? AND name = ?').bind(project.userId, project.name),
  ];
  const [, selected] = await db.batch(statements);
  const row = (selected.results ?? [])[0] as ProjectRow | undefined;
  const resolved = projectFromRow(row ?? null);
  if (!resolved) throw new Error('Project could not be created');
  return resolved;
}

export async function updateProjectCost(db: D1Database, projectId: number, cost: string): Promise<void> {
  await db.prepare('UPDATE project SET cost = ?, last_update_timestamp = CURRENT_TIMESTAMP WHERE id = ?').bind(cost, projectId).run();
}
export async function updateProjectAverageDuration(db: D1Database, projectId: number, averageDuration: number): Promise<void> {
  await db.prepare('UPDATE project SET avg_duration = ?, last_update_timestamp = CURRENT_TIMESTAMP WHERE id = ?').bind(averageDuration, projectId).run();
}
export async function updateProjectDescription(db: D1Database, userId: string, projectId: number, description: string): Promise<Project | null> {
  await db.prepare('UPDATE project SET description = ?, last_update_timestamp = CURRENT_TIMESTAMP WHERE user_uuid = ? AND id = ?').bind(description, userId, projectId).run();
  return findProjectById(db, userId, projectId);
}
export async function deleteProject(db: D1Database, userId: string, name: string): Promise<void> {
  await db.prepare('DELETE FROM project WHERE user_uuid = ? AND name = ?').bind(userId, name).run();
}
