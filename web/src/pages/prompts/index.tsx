import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { GitBranch, MousePointerClick, FolderOpen, TrendingUp, FileText, ChevronRight } from "lucide-react"
import { PipelineTree } from "./components/pipeline-tree"
import { PerformanceChart } from "./components/performance-chart"
import { PromptDetail } from "./components/prompt-detail"
import { RecommendationDetail } from "./components/recommendation-detail"
import { CompactRecommendations } from "./components/compact-recommendations"
import {
  mockProjects,
  mockPipelines,
  mockPerformanceData,
  mockRecommendations,
} from "./mock-data"
import { cn } from "@/lib/utils"
import type { Pipeline, PromptVersionStatus } from "./types"

const PIPELINE_COLORS = ["#C96442", "#9C7BB5", "#5A9E92", "#C9954A", "#B86070"]

type ViewMode = "performance" | "prompt"

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center px-6">
      <div className="flex items-center justify-center size-12 rounded-xl bg-muted/60">
        <MousePointerClick className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{t("prompts.pipeline.selectHint")}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
          {t("prompts.pipeline.selectHintDescription")}
        </p>
      </div>
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted/40 border border-border/50 rounded-xl p-1 shrink-0">
      <button
        onClick={() => onChange("performance")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150",
          value === "performance"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <TrendingUp className="size-3.5" />
        Performance
      </button>
      <button
        onClick={() => onChange("prompt")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150",
          value === "prompt"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <FileText className="size-3.5" />
        Prompt
      </button>
    </div>
  )
}

export default function PromptsPage() {
  const { t } = useTranslation()

  const [pipelines, setPipelines] = useState<Pipeline[]>(mockPipelines)
  const [selectedProjectId, setSelectedProjectId] = useState(mockProjects[0].id)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("performance")

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    setSelectedPipelineId(null)
    setSelectedPromptId(null)
    setSelectedVersionId(null)
    setSelectedRecId(null)
  }

  const handleSelectPipeline = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
    setSelectedPromptId(null)
    setSelectedVersionId(null)
    setSelectedRecId(null)
  }

  const handleSelectPrompt = (pipelineId: string, promptId: string) => {
    setSelectedPipelineId(pipelineId)
    setSelectedPromptId(promptId)
    setSelectedVersionId(null)
    setSelectedRecId(null)
  }

  const handleSelectVersion = (pipelineId: string, promptId: string, versionId: string) => {
    setSelectedPipelineId(pipelineId)
    setSelectedPromptId(promptId)
    setSelectedVersionId(versionId)
    setSelectedRecId(null)
  }

  const handleSetPipelineStatus = (pipelineId: string, status: "active" | "archived") => {
    setPipelines((prev) => prev.map((p) => (p.id === pipelineId ? { ...p, status } : p)))
  }

  const handleSetVersionStatus = (
    pipelineId: string,
    promptId: string,
    versionId: string,
    status: PromptVersionStatus
  ) => {
    setPipelines((prev) =>
      prev.map((pipeline) => {
        if (pipeline.id !== pipelineId) return pipeline
        return {
          ...pipeline,
          prompts: pipeline.prompts.map((prompt) => {
            if (prompt.id !== promptId) return prompt
            return {
              ...prompt,
              versions: prompt.versions.map((v) => {
                if (v.id === versionId) return { ...v, status }
                if (status === "current" && v.status === "current")
                  return { ...v, status: "deprecated" as PromptVersionStatus }
                return v
              }),
            }
          }),
        }
      })
    )
  }

  const handleAddPipeline = (name: string, projectId: string) => {
    const existing = pipelines.filter((p) => p.projectId === projectId)
    const color = PIPELINE_COLORS[existing.length % PIPELINE_COLORS.length]
    setPipelines((prev) => [
      ...prev,
      {
        id: `pipeline-${Date.now()}`,
        projectId,
        name,
        description: "",
        status: "active",
        chartColor: color,
        prompts: [],
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      },
    ])
  }

  const projectPipelines = pipelines.filter((p) => p.projectId === selectedProjectId)
  const projectRecommendations = mockRecommendations.filter((r) => r.projectId === selectedProjectId)
  const projectPerformanceData = mockPerformanceData[selectedProjectId] ?? []

  const selectedPipeline = projectPipelines.find((p) => p.id === selectedPipelineId) ?? null
  const selectedPrompt = selectedPipeline?.prompts.find((p) => p.id === selectedPromptId) ?? null
  const selectedVersion = selectedPrompt?.versions.find((v) => v.id === selectedVersionId) ?? null
  const selectedRec = projectRecommendations.find((r) => r.id === selectedRecId) ?? null

  const versionSelected = !!(selectedVersion && selectedPipeline && selectedPrompt)

  return (
    <div className="px-4 lg:px-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("prompts.title")}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("prompts.description")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FolderOpen className="size-4 text-muted-foreground" />
          <Select value={selectedProjectId} onValueChange={handleSelectProject}>
            <SelectTrigger className="h-9 w-[220px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* Left Panel */}
        <div className="w-[260px] shrink-0 flex flex-col overflow-hidden border-r border-border/30">
          <CompactRecommendations
            recommendations={projectRecommendations}
            selectedId={selectedRecId}
            onSelect={(id) => {
              setSelectedRecId(id)
              setSelectedPipelineId(null)
              setSelectedPromptId(null)
              setSelectedVersionId(null)
            }}
          />
          <div className="px-3 py-2 flex items-center gap-2">
            <GitBranch className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">{t("prompts.pipeline.title")}</span>
          </div>
          <div className="flex-1 px-2 pb-2 min-h-0 overflow-hidden">
            <PipelineTree
              pipelines={projectPipelines}
              selectedPipelineId={selectedPipelineId}
              selectedPromptId={selectedPromptId}
              selectedVersionId={selectedVersionId}
              onSelectPipeline={handleSelectPipeline}
              onSelectPrompt={handleSelectPrompt}
              onSelectVersion={handleSelectVersion}
              onSetPipelineStatus={handleSetPipelineStatus}
              onSetVersionStatus={handleSetVersionStatus}
              onAddPipeline={handleAddPipeline}
              projectId={selectedProjectId}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 pl-4 overflow-hidden">

          {selectedRec ? (
            /* ── Rec selected: always takes priority ── */
            <div className="flex-1 overflow-y-auto">
              <RecommendationDetail recommendation={selectedRec} pipelines={projectPipelines} />
            </div>
          ) : versionSelected ? (
            /* ── Version selected: header row + toggle ── */
            <>
              <div className="flex items-center justify-between gap-4 shrink-0 pb-3 border-b border-border/25">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                  <span className="text-foreground/40 shrink-0 truncate max-w-[120px] text-xs">{selectedPipeline!.name}</span>
                  <ChevronRight className="size-3 shrink-0 text-border/60" />
                  <span className="font-medium text-foreground/60 truncate max-w-[140px] text-xs">{selectedPrompt!.name}</span>
                  <ChevronRight className="size-3 shrink-0 text-border/60" />
                  <span className="font-mono font-semibold text-foreground shrink-0 text-sm">{selectedVersion!.version}</span>
                  <div className="ml-2 shrink-0">
                    {selectedVersion!.status === "current" && (
                      <Badge variant="outline" className="h-5 px-2 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8">
                        {t("prompts.prompt.current")}
                      </Badge>
                    )}
                    {selectedVersion!.status === "deprecated" && (
                      <Badge variant="outline" className="h-5 px-2 text-xs text-muted-foreground">
                        {t("prompts.prompt.deprecated")}
                      </Badge>
                    )}
                    {selectedVersion!.status === "testing" && (
                      <Badge variant="outline" className="h-5 px-2 text-xs border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/8">
                        {t("prompts.prompt.testing")}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* View toggle */}
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>

              {viewMode === "performance" ? (
                <div className="rounded-xl bg-card/40 border border-border/25 px-5 py-4">
                  <PerformanceChart
                    pipelines={projectPipelines}
                    performanceData={projectPerformanceData}
                    selectedPipeline={selectedPipeline}
                    selectedPrompt={selectedPrompt}
                    selectedVersionId={selectedVersionId}
                  />
                </div>
              ) : (
                <PromptDetail version={selectedVersion!} />
              )}
            </>
          ) : (
            /* ── Nothing selected: chart + empty state ── */
            <>
              <div className="rounded-xl bg-card/40 border border-border/25 px-5 py-4">
                <PerformanceChart
                  pipelines={projectPipelines}
                  performanceData={projectPerformanceData}
                  selectedPipeline={selectedPipeline}
                  selectedPrompt={selectedPrompt}
                  selectedVersionId={selectedVersionId}
                />
              </div>
              <div className="flex-1">
                <EmptyState />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
