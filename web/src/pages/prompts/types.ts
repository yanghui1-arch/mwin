export type PipelineStatus = "active" | "archived"
export type PromptVersionStatus = "current" | "deprecated" | "testing"
export type ConfidenceLevel = "high" | "medium" | "low"
export type MetricKey = "successRate" | "latencyMs" | "tokenCostPer1k"

export interface PromptMetrics {
  latencyMs: number
  tokenCostPer1k: number
  successRate: number
  usageCount: number
}

export interface VersionHistoryPoint {
  date: string
  successRate: number
  latencyMs: number
  tokenCostPer1k: number
}

export interface ModelConfig {
  model: string
  temperature?: number
  topP?: number
  topK?: number
}

export interface PromptVersion {
  id: string
  version: string
  status: PromptVersionStatus
  content: string
  modelConfig: ModelConfig
  createdAt: string
  metrics: PromptMetrics
  changelog?: string
  performanceHistory?: VersionHistoryPoint[]
}

// A named prompt with its own role in the pipeline, and multiple versions
export interface Prompt {
  id: string
  name: string
  description?: string
  versions: PromptVersion[]
}

export interface Project {
  id: string
  name: string
  description?: string
}

export interface Pipeline {
  id: string
  projectId: string
  name: string
  description?: string
  status: PipelineStatus
  prompts: Prompt[]            // named prompts — each has its own version history
  createdAt: string
  lastUsedAt?: string
  chartColor: string
}

export interface PerformanceDataPoint {
  period: string
  [key: string]: number | string
}

export interface RecommendedCombination {
  id: string
  projectId: string
  title: string
  description: string
  rationale: string
  estimatedImprovement: number
  pipelineIds: string[]
  promptIds: string[]          // named prompt IDs
  confidence: ConfidenceLevel
  tradeoffs: string[]
}
