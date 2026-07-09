import { getTotalTokens } from './pricing.js';

export class OverviewService {
  constructor(repositories) {
    this.repositories = repositories;
  }

  async getSummary(userId, today = new Date()) {
    const projects = await this.repositories.listProjects(userId);
    if (!projects.length) {
      return { projectCount: 0, lifetimeTotalTokens: 0, yesterdayTotalTokens: 0, todayTotalTokens: 0, todayVsYesterdayPercentage: null, yesterdayVsDayBeforePercentage: null };
    }
    const rows = await this.repositories.tokenSnapshots(projects.map((project) => project.id));
    return buildSummary(projects.length, rows, today);
  }
}

export function buildSummary(projectCount, rows, todayDate = new Date()) {
  const today = todayDate.toISOString().slice(0, 10);
  const yesterday = new Date(todayDate.getTime() - 86_400_000).toISOString().slice(0, 10);
  const before = new Date(todayDate.getTime() - 172_800_000).toISOString().slice(0, 10);
  let lifetimeTotalTokens = 0;
  let todayTotalTokens = 0;
  let yesterdayTotalTokens = 0;
  let dayBeforeYesterdayTotalTokens = 0;

  for (const row of rows) {
    const tokens = getTotalTokens(typeof row.usage === 'string' ? JSON.parse(row.usage) : row.usage);
    const date = new Date(row.start_time ?? row.startTime).toISOString().slice(0, 10);
    lifetimeTotalTokens += tokens;
    if (date === today) todayTotalTokens += tokens;
    if (date === yesterday) yesterdayTotalTokens += tokens;
    if (date === before) dayBeforeYesterdayTotalTokens += tokens;
  }

  return {
    projectCount,
    lifetimeTotalTokens,
    yesterdayTotalTokens,
    todayTotalTokens,
    todayVsYesterdayPercentage: percentageChange(yesterdayTotalTokens, todayTotalTokens),
    yesterdayVsDayBeforePercentage: percentageChange(dayBeforeYesterdayTotalTokens, yesterdayTotalTokens),
  };
}

export function percentageChange(previousValue, currentValue) {
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) * 100) / previousValue;
}
