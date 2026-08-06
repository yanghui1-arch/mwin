import { getTotalTokens } from './pricing.js';
import type { RepositoryPort } from '../repositories/port.js';
import type { Project, TokenSnapshot, Usage } from '../domain/types.js';

const ONE_DAY_HOURS = 24;
const SEVEN_DAYS_HOURS = 24 * 7;
const THIRTY_DAYS_HOURS = 24 * 30;

export interface OverviewSummaryData {
  projectCount: number;
  lifetimeTotalTokens: number;
  yesterdayTotalTokens: number;
  todayTotalTokens: number;
  todayVsYesterdayPercentage: number | null;
  yesterdayVsDayBeforePercentage: number | null;
}

export interface OverviewTokenCurvePointData { bucketStart: string; tokens: number }
export interface OverviewProjectTokenCurveData { projectId: number; projectName: string; points: OverviewTokenCurvePointData[] }
export interface OverviewTokenCurveData {
  windowHours: number;
  granularity: 'hour' | 'day';
  projectIds: number[];
  series: OverviewProjectTokenCurveData[];
}

export class OverviewService {
  constructor(private readonly repositories: RepositoryPort) {}
  /** Builds token totals and daily comparisons across all projects owned by a user. */
  async getSummary(userId: string, today = new Date()) {
    const projects = await this.repositories.listProjects(userId);
    if (!projects.length) return buildSummary(0, [], today);
    return buildSummary(projects.length, await this.repositories.tokenSnapshots(projects.map((project) => project.id)), today);
  }

  /** Produces zero-filled hourly or daily series for the user's selected projects. */
  async getTokenCurve(userId: string, requestedWindowHours: number, requestedProjectIds: number[], today = new Date()): Promise<OverviewTokenCurveData> {
    const windowHours = normalizeWindowHours(requestedWindowHours);
    const granularity = windowHours === ONE_DAY_HOURS ? 'hour' : 'day';
    const ownedProjects = await this.repositories.listProjects(userId);
    if (!ownedProjects.length) return { windowHours, granularity, projectIds: [], series: [] };

    const projectIds = selectOwnedProjectIds(ownedProjects, requestedProjectIds);
    if (!projectIds.length) return { windowHours, granularity, projectIds: [], series: [] };

    const { start, end } = curveRange(windowHours, today);
    const tokenSnapshots = await this.repositories.tokenSnapshots(projectIds);
    const projectById = new Map(ownedProjects.map((project) => [project.id, project]));
    return {
      windowHours,
      granularity,
      projectIds,
      series: projectIds.map((projectId) => ({
        projectId,
        projectName: projectById.get(projectId)?.name ?? String(projectId),
        points: buildCurvePoints(tokenSnapshots, projectId, start, end, granularity),
      })),
    };
  }
}
/** Aggregates token snapshots into lifetime and recent UTC-day totals. */
export function buildSummary(projectCount: number, rows: TokenSnapshot[], todayDate = new Date()): OverviewSummaryData {
  // Persisted timestamps are ISO values; UTC date keys keep aggregation independent of Worker location.
  const today = todayDate.toISOString().slice(0, 10);
  const yesterday = new Date(todayDate.getTime() - 86_400_000).toISOString().slice(0, 10);
  const before = new Date(todayDate.getTime() - 172_800_000).toISOString().slice(0, 10);
  let lifetimeTotalTokens = 0, todayTotalTokens = 0, yesterdayTotalTokens = 0, dayBeforeYesterdayTotalTokens = 0;
  for (const row of rows) {
    const usage = usageFromSnapshot(row);
    if (!usage) continue;
    const tokens = getTotalTokens(usage);
    const timestamp = row.start_time ?? row.startTime;
    const dateValue = timestamp ? new Date(timestamp) : null;
    if (!dateValue || Number.isNaN(dateValue.getTime())) continue;
    const date = dateValue.toISOString().slice(0, 10);
    lifetimeTotalTokens += tokens;
    if (date === today) todayTotalTokens += tokens;
    if (date === yesterday) yesterdayTotalTokens += tokens;
    if (date === before) dayBeforeYesterdayTotalTokens += tokens;
  }
  return { projectCount, lifetimeTotalTokens, yesterdayTotalTokens, todayTotalTokens,
    todayVsYesterdayPercentage: percentageChange(yesterdayTotalTokens, todayTotalTokens),
    yesterdayVsDayBeforePercentage: percentageChange(dayBeforeYesterdayTotalTokens, yesterdayTotalTokens) };
}
/** Returns percentage growth, or null when no previous baseline exists. */
export function percentageChange(previousValue: number, currentValue: number): number | null {
  return previousValue === 0 ? null : ((currentValue - previousValue) * 100) / previousValue;
}

/** Converts the service model to the snake_case contract consumed by web/src/api/overview.ts. */
export function toOverviewSummaryResponse(data: OverviewSummaryData) {
  return {
    tracked_project_count: data.projectCount,
    lifetime_total_tokens: data.lifetimeTotalTokens,
    yesterday_total_tokens: data.yesterdayTotalTokens,
    today_total_tokens: data.todayTotalTokens,
    today_change_pct: data.todayVsYesterdayPercentage,
    yesterday_change_pct: data.yesterdayVsDayBeforePercentage,
  };
}

/** Converts curve data to the snake_case HTTP contract shared with the Java backend. */
export function toOverviewTokenCurveResponse(data: OverviewTokenCurveData) {
  return {
    window_hours: data.windowHours,
    granularity: data.granularity,
    project_ids: data.projectIds,
    series: data.series.map((series) => ({
      project_id: series.projectId,
      project_name: series.projectName,
      points: series.points.map((point) => ({ bucket_start: point.bucketStart, tokens: point.tokens })),
    })),
  };
}

function normalizeWindowHours(windowHours: number): number {
  return [ONE_DAY_HOURS, SEVEN_DAYS_HOURS, THIRTY_DAYS_HOURS].includes(windowHours) ? windowHours : THIRTY_DAYS_HOURS;
}

function selectOwnedProjectIds(ownedProjects: Project[], requestedProjectIds: number[]): number[] {
  const ownedProjectIds = new Set(ownedProjects.map((project) => project.id));
  const candidates = requestedProjectIds.length ? requestedProjectIds : ownedProjects.map((project) => project.id);
  return [...new Set(candidates.filter((projectId) => ownedProjectIds.has(projectId)))];
}

function curveRange(windowHours: number, now: Date): { start: Date; end: Date } {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = windowHours / 24;
  const start = new Date(startOfToday.getTime() - (days - 1) * 86_400_000);
  const end = new Date(startOfToday.getTime() + 86_400_000);
  return { start, end };
}

function buildCurvePoints(
  snapshots: TokenSnapshot[],
  projectId: number,
  start: Date,
  end: Date,
  granularity: 'hour' | 'day',
): OverviewTokenCurvePointData[] {
  const increment = granularity === 'hour' ? 3_600_000 : 86_400_000;
  const buckets = new Map<number, number>();
  for (let cursor = start.getTime(); cursor < end.getTime(); cursor += increment) buckets.set(cursor, 0);

  for (const snapshot of snapshots) {
    if (snapshot.projectId !== projectId) continue;
    const timestamp = snapshot.start_time ?? snapshot.startTime;
    const time = timestamp ? new Date(timestamp).getTime() : Number.NaN;
    const usage = usageFromSnapshot(snapshot);
    if (Number.isNaN(time) || !usage) continue;
    const date = new Date(time);
    const bucket = granularity === 'hour'
      ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())
      : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    if (buckets.has(bucket)) buckets.set(bucket, (buckets.get(bucket) ?? 0) + getTotalTokens(usage));
  }

  return [...buckets.entries()].map(([bucketStart, tokens]) => ({
    bucketStart: new Date(bucketStart).toISOString(),
    tokens,
  }));
}

function usageFromSnapshot(snapshot: TokenSnapshot): Usage | null {
  if (typeof snapshot.usage !== 'string') return snapshot.usage;
  try { return JSON.parse(snapshot.usage) as Usage; } catch { return null; }
}
