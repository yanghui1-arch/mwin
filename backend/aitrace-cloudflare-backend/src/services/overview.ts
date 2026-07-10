import { getTotalTokens } from './pricing.js';
import type { RepositoryPort } from '../repositories/port.js';
import type { TokenSnapshot, Usage } from '../domain/types.js';

export class OverviewService {
  constructor(private readonly repositories: RepositoryPort) {}
  async getSummary(userId: string, today = new Date()) {
    const projects = await this.repositories.listProjects(userId);
    if (!projects.length) return buildSummary(0, [], today);
    return buildSummary(projects.length, await this.repositories.tokenSnapshots(projects.map((project) => project.id)), today);
  }
}
export function buildSummary(projectCount: number, rows: TokenSnapshot[], todayDate = new Date()) {
  // Persisted timestamps are ISO values; UTC date keys keep aggregation independent of Worker location.
  const today = todayDate.toISOString().slice(0, 10);
  const yesterday = new Date(todayDate.getTime() - 86_400_000).toISOString().slice(0, 10);
  const before = new Date(todayDate.getTime() - 172_800_000).toISOString().slice(0, 10);
  let lifetimeTotalTokens = 0, todayTotalTokens = 0, yesterdayTotalTokens = 0, dayBeforeYesterdayTotalTokens = 0;
  for (const row of rows) {
    const usage = typeof row.usage === 'string' ? JSON.parse(row.usage) as Usage : row.usage;
    const tokens = getTotalTokens(usage);
    const date = new Date(row.start_time ?? row.startTime!).toISOString().slice(0, 10);
    lifetimeTotalTokens += tokens;
    if (date === today) todayTotalTokens += tokens;
    if (date === yesterday) yesterdayTotalTokens += tokens;
    if (date === before) dayBeforeYesterdayTotalTokens += tokens;
  }
  return { projectCount, lifetimeTotalTokens, yesterdayTotalTokens, todayTotalTokens,
    todayVsYesterdayPercentage: percentageChange(yesterdayTotalTokens, todayTotalTokens),
    yesterdayVsDayBeforePercentage: percentageChange(dayBeforeYesterdayTotalTokens, yesterdayTotalTokens) };
}
export function percentageChange(previousValue: number, currentValue: number): number | null {
  return previousValue === 0 ? null : ((currentValue - previousValue) * 100) / previousValue;
}
