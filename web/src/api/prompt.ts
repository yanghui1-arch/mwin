import http from "./http"
import type { Pipeline, Prompt, PromptVersion, PromptVersionStatus } from "@/pages/prompts/types"

// Raw response types (backend snake_case)

type ModelConfigResponse = {
  model: string
  temperature?: number
  top_k?: number
  top_p?: number
}

type PromptVersionResponse = {
  id: string
  prompt_pipeline_id: string
  version: string
  content: string
  model_config?: ModelConfigResponse
  created_at: string
  status: string
  name?: string
  description?: string
  changelog?: string
}

type PromptGroupResponse = {
  name?: string
  description?: string
  versions: PromptVersionResponse[]
}

type PromptStatusResponse = {
  id: string
  prompt_pipeline_id: string
  status: string
  prompt_id: string
  version?: string
}

type PromptPipelineResponse = {
  id: string
  project_id: number
  name: string
  description?: string
  created_at: string
  status: string
  version_count: number
  statuses: PromptStatusResponse[]
  prompts: PromptGroupResponse[]
}

type APIResponse<T> = {
  code: number
  message: string
  data: T
}

// Response -> Domain

const PIPELINE_COLORS = ["#C96442", "#9C7BB5", "#5A9E92", "#C9954A", "#B86070"]

function toPromptVersion(v: PromptVersionResponse): PromptVersion {
  return {
    id: v.id,
    version: v.version,
    status: (v.status as PromptVersionStatus) ?? "deprecated",
    content: v.content,
    modelConfig: {
      model: v.model_config?.model ?? "",
      temperature: v.model_config?.temperature,
      topP: v.model_config?.top_p,
      topK: v.model_config?.top_k,
    },
    createdAt: v.created_at,
    changelog: v.changelog,
    metrics: { latencyMs: 0, tokenCostPer1k: 0, successRate: 0, usageCount: 0 },
  }
}

function toPromptGroup(group: PromptGroupResponse, pipelineId: string): Prompt {
  return {
    id: group.name || pipelineId,
    name: group.name || "",
    description: group.description,
    versions: group.versions.map(toPromptVersion),
  }
}

function toPipeline(vo: PromptPipelineResponse, index: number): Pipeline {
  return {
    id: vo.id,
    projectId: String(vo.project_id),
    name: vo.name,
    description: vo.description,
    status: (vo.status as Pipeline["status"]) ?? "active",
    chartColor: PIPELINE_COLORS[index % PIPELINE_COLORS.length],
    createdAt: vo.created_at,
    prompts: (vo.prompts ?? []).map((g) => toPromptGroup(g, vo.id)),
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const promptApi = {
  async listPipelines(projectId: number): Promise<Pipeline[]> {
    const res = await http.get<APIResponse<PromptPipelineResponse[]>>(`/v0/prompt/${projectId}`)
    const data = res.data.data
    return Array.isArray(data) ? data.map(toPipeline) : []
  },

  createPipeline(body: { project_id: number; name: string; description?: string }) {
    return http.post<APIResponse<string>>("/v0/prompt/create_prompt_pipeline", body)
  },

  updatePipelineStatus(pipelineId: string, status: string) {
    return http.patch<APIResponse<void>>(`/v0/prompt/pipeline/${pipelineId}/status`, { status })
  },

  updatePromptStatus(promptId: string, status: string) {
    return http.patch<APIResponse<void>>(`/v0/prompt/${promptId}/status`, { status })
  },
}
