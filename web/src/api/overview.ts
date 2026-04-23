import http from "./http"

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type OverviewSummaryResponse = {
  tracked_project_count: number
  lifetime_total_tokens: number
  yesterday_total_tokens: number
  today_total_tokens: number
  today_change_pct: number | null
  yesterday_change_pct: number | null
}

type OverviewTokenCurvePointResponse = {
  bucket_start: string
  tokens: number
}

type OverviewProjectTokenCurveResponse = {
  project_id: number
  project_name: string
  points: OverviewTokenCurvePointResponse[]
}

type OverviewTokenCurveResponse = {
  window_hours: number
  granularity: "hour" | "day"
  project_ids: number[]
  series: OverviewProjectTokenCurveResponse[]
}

export type OverviewSummary = {
  trackedProjectCount: number
  lifetimeTotalTokens: number
  yesterdayTotalTokens: number
  todayTotalTokens: number
  todayChangePct: number | null
  yesterdayChangePct: number | null
}

export type OverviewCurvePoint = {
  bucketStart: string
  tokens: number
}

export type OverviewProjectCurve = {
  projectId: number
  projectName: string
  points: OverviewCurvePoint[]
}

export type OverviewTokenCurve = {
  windowHours: number
  granularity: "hour" | "day"
  projectIds: number[]
  series: OverviewProjectCurve[]
}

export type OverviewWindowHours = 24 | 168 | 720

function toSummary(response: OverviewSummaryResponse): OverviewSummary {
  return {
    trackedProjectCount: response.tracked_project_count,
    lifetimeTotalTokens: response.lifetime_total_tokens,
    yesterdayTotalTokens: response.yesterday_total_tokens,
    todayTotalTokens: response.today_total_tokens,
    todayChangePct: response.today_change_pct,
    yesterdayChangePct: response.yesterday_change_pct,
  }
}

function toPoint(response: OverviewTokenCurvePointResponse): OverviewCurvePoint {
  return {
    bucketStart: response.bucket_start,
    tokens: response.tokens,
  }
}

function toSeries(response: OverviewProjectTokenCurveResponse): OverviewProjectCurve {
  return {
    projectId: response.project_id,
    projectName: response.project_name,
    points: Array.isArray(response.points) ? response.points.map(toPoint) : [],
  }
}

function toTokenCurve(response: OverviewTokenCurveResponse): OverviewTokenCurve {
  return {
    windowHours: response.window_hours,
    granularity: response.granularity,
    projectIds: response.project_ids,
    series: Array.isArray(response.series) ? response.series.map(toSeries) : [],
  }
}

export const overviewApi = {
  async getSummary(): Promise<OverviewSummary> {
    const res = await http.get<ApiResponse<OverviewSummaryResponse>>("/v0/overview/summary")
    return toSummary(res.data.data)
  },

  async getTokenCurve(windowHours: OverviewWindowHours, projectIds: number[]): Promise<OverviewTokenCurve> {
    const params: Record<string, string> = { window_hours: String(windowHours) }
    if (projectIds.length > 0) {
      params.project_ids = projectIds.join(",")
    }
    const res = await http.get<ApiResponse<OverviewTokenCurveResponse>>("/v0/overview/token-curve", { params })
    return toTokenCurve(res.data.data)
  },
}
