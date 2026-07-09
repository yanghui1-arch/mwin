import { projectFromRow } from './repository-mappers.js';

export async function findProject(db, userId, name) {
  return projectFromRow(await db.prepare('SELECT * FROM project WHERE user_uuid = ? AND name = ?')
    .bind(userId, name).first());
}

export async function findProjectById(db, userId, projectId) {
  return projectFromRow(await db.prepare('SELECT * FROM project WHERE user_uuid = ? AND id = ?')
    .bind(userId, projectId).first());
}

export async function listProjects(db, userId) {
  const { results } = await db.prepare('SELECT * FROM project WHERE user_uuid = ? ORDER BY last_update_timestamp DESC')
    .bind(userId).all();
  return results.map(projectFromRow);
}

export async function createProject(db, project) {
  const result = await db.prepare(
    'INSERT INTO project (user_uuid, name, description, strategy, avg_duration, cost, created_timestamp, last_update_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(project.userId, project.name, project.description, project.strategy, project.averageDuration, project.cost, project.createdTimestamp, project.lastUpdateTimestamp).run();
  return { ...project, id: result.meta.last_row_id };
}

export async function updateProjectCost(db, projectId, cost) {
  await db.prepare('UPDATE project SET cost = ?, last_update_timestamp = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(cost, projectId).run();
}

export async function updateProjectAverageDuration(db, projectId, averageDuration) {
  await db.prepare('UPDATE project SET avg_duration = ?, last_update_timestamp = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(averageDuration, projectId).run();
}

export async function updateProjectDescription(db, userId, projectId, description) {
  await db.prepare('UPDATE project SET description = ?, last_update_timestamp = CURRENT_TIMESTAMP WHERE user_uuid = ? AND id = ?')
    .bind(description, userId, projectId).run();
  return findProjectById(db, userId, projectId);
}

export async function deleteProject(db, userId, name) {
  await db.prepare('DELETE FROM project WHERE user_uuid = ? AND name = ?').bind(userId, name).run();
}
