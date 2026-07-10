/** Drizzle D1 operations for user-owned projects and project aggregates. */
import { and, desc, eq, sql } from 'drizzle-orm';
import { projects } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { NewProject, Project } from '../domain/types.js';

function toProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    strategy: row.strategy,
    averageDuration: row.averageDuration,
    cost: row.cost,
    createdTimestamp: row.createdTimestamp,
    lastUpdateTimestamp: row.lastUpdateTimestamp,
  };
}

function projectValues(project: NewProject) {
  return {
    userId: project.userId,
    name: project.name,
    description: project.description,
    strategy: project.strategy,
    averageDuration: project.averageDuration,
    cost: project.cost,
    createdTimestamp: project.createdTimestamp,
    lastUpdateTimestamp: project.lastUpdateTimestamp,
  };
}

export async function findProject(db: AppDatabase, userId: string, name: string): Promise<Project | null> {
  const row = await db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.name, name))).get();
  return row ? toProject(row) : null;
}

export async function findProjectById(db: AppDatabase, userId: string, projectId: number): Promise<Project | null> {
  const row = await db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.id, projectId))).get();
  return row ? toProject(row) : null;
}

export async function listProjects(db: AppDatabase, userId: string): Promise<Project[]> {
  const rows = await db.select().from(projects).where(eq(projects.userId, userId))
    .orderBy(desc(projects.lastUpdateTimestamp)).all();
  return rows.map(toProject);
}

export async function createProject(db: AppDatabase, project: NewProject): Promise<Project> {
  const result = await db.insert(projects).values(projectValues(project)).run();
  return { ...project, id: Number(result.meta.last_row_id) };
}

/** Resolves concurrent first telemetry writes without creating duplicate projects. */
export async function ensureProject(db: AppDatabase, project: NewProject): Promise<Project> {
  await db.insert(projects).values(projectValues(project)).onConflictDoNothing({
    target: [projects.userId, projects.name],
  }).run();
  const resolved = await findProject(db, project.userId, project.name);
  if (!resolved) throw new Error('Project could not be created');
  return resolved;
}

export async function updateProjectCost(db: AppDatabase, projectId: number, cost: string): Promise<void> {
  await db.update(projects).set({ cost, lastUpdateTimestamp: sql`CURRENT_TIMESTAMP` })
    .where(eq(projects.id, projectId)).run();
}

export async function updateProjectAverageDuration(db: AppDatabase, projectId: number, averageDuration: number): Promise<void> {
  await db.update(projects).set({ averageDuration, lastUpdateTimestamp: sql`CURRENT_TIMESTAMP` })
    .where(eq(projects.id, projectId)).run();
}

export async function updateProjectDescription(db: AppDatabase, userId: string, projectId: number, description: string): Promise<Project | null> {
  await db.update(projects).set({ description, lastUpdateTimestamp: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId))).run();
  return findProjectById(db, userId, projectId);
}

export async function deleteProject(db: AppDatabase, userId: string, name: string): Promise<void> {
  await db.delete(projects).where(and(eq(projects.userId, userId), eq(projects.name, name))).run();
}
