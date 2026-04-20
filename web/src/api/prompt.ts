import http from "./http"
import type { Pipeline, Prompt, PromptVersion, ModelConfig, PromptMetrics, PerformanceDataPoint } from "@/pages/prompts/types"

// Raw response types (backend snake_case)

type PromptVersionDetailResponse = {
  name?: string
  version: string
  content: string
  model_config?: {
    model: string
    temperature?: number
    top_k?: number
    top_p?: number
  }
  created_at: string
  status: string
  description?: string
  metrics?: {
    usage_count: number
    avg_latency_ms: number
    token_cost_per1k: number
    success_rate: number
  }
}

type PromptGroupSummaryResponse = {
  name: string
  versions: {
    id: string
    version: string
    status: string
    created_at: string
  }[]
}

type PromptPipelineResponse = {
  id: string
  project_id: number
  name: string
  description?: string
  created_at: string
  status: string
  prompt_count: number
  version_count: number
}

type APIResponse<T> = {
  code: number
  message: string
  data: T
}

// Response -> Domain

const PIPELINE_COLORS = ["#C96442", "#9C7BB5", "#5A9E92", "#C9954A", "#B86070"]

function toPipeline(vo: PromptPipelineResponse, index: number): Pipeline {
  return {
    id: vo.id,
    projectId: String(vo.project_id),
    name: vo.name,
    description: vo.description,
    status: (vo.status as Pipeline["status"]) ?? "active",
    chartColor: PIPELINE_COLORS[index % PIPELINE_COLORS.length],
    createdAt: vo.created_at,
    promptCount: vo.prompt_count,
    versionCount: vo.version_count,
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const promptApi = {
  async listPipelines(projectId: number): Promise<Pipeline[]> {
    const res = await http.get<APIResponse<PromptPipelineResponse[]>>(`/v0/prompt/${projectId}`)
    const data = res.data.data
    return Array.isArray(data) ? data.map(toPipeline) : []
  },

  async getPerformanceData(projectId: number): Promise<PerformanceDataPoint[]> {
    const res = await http.get<APIResponse<PerformanceDataPoint[]>>(`/v0/prompt/${projectId}/performance`)
    return Array.isArray(res.data.data) ? res.data.data : []
  },

  async getVersionDetail(versionId: string): Promise<PromptVersion> {
    const res = await http.get<APIResponse<PromptVersionDetailResponse>>(`/v0/prompt/version/${versionId}/detail`)
    const d = res.data.data
    const modelConfig: ModelConfig | undefined = d.model_config
      ? { model: d.model_config.model, temperature: d.model_config.temperature, topK: d.model_config.top_k, topP: d.model_config.top_p }
      : undefined
    const metrics: PromptMetrics | undefined = d.metrics
      ? { usageCount: d.metrics.usage_count, latencyMs: d.metrics.avg_latency_ms, tokenCostPer1k: d.metrics.token_cost_per1k, successRate: d.metrics.success_rate }
      : undefined
    return {
      id: versionId,
      version: d.version,
      status: d.status as PromptVersion["status"],
      content: d.content,
      modelConfig,
      metrics,
      createdAt: d.created_at,
      description: d.description,
    }
  },

  async listPipelinePrompts(pipelineId: string): Promise<Prompt[]> {
    const res = await http.get<APIResponse<PromptGroupSummaryResponse[]>>(`/v0/prompt/pipeline/${pipelineId}/prompts`)
    const data = res.data.data
    if (!Array.isArray(data)) return []
    return data.map((g): Prompt => ({
      id: g.name || pipelineId,
      name: g.name,
      versions: g.versions.map((v): PromptVersion => ({
        id: v.id,
        version: v.version,
        status: v.status as PromptVersion["status"],
        createdAt: v.created_at,
      })),
    }))
  },

  createPipeline(body: { project_id: number; name: string; description?: string }) {
    return http.post<APIResponse<string>>("/v0/prompt/create_prompt_pipeline", body)
  },

  createPrompt(body: {
    prompt_pipeline_id: string
    version: string
    content: string
    name: string
    description?: string
    changelog?: string
  }) {
    return http.post<APIResponse<string>>("/v0/prompt/version", body)
  },

  updatePipelineStatus(pipelineId: string, status: string) {
    return http.patch<APIResponse<void>>(`/v0/prompt/pipeline/${pipelineId}/status`, { status })
  },

  updatePromptStatus(promptId: string, status: string) {
    return http.post<APIResponse<void>>(`/v0/prompt/${promptId}/status`, { status })
  },
}

