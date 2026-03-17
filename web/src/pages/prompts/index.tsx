import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { GitBranch, MousePointerClick, FolderOpen, TrendingUp, FileText, ChevronRight } from "lucide-react"
import { PipelineTree } from "./components/pipeline-tree"
import { PerformanceChart } from "./components/performance-chart"
import { PromptDetail } from "./components/prompt-detail"
import { CompactRecommendations } from "./components/compact-recommendations"
import { cn } from "@/lib/utils"
import type { Pipeline, Prompt, PromptVersion, PerformanceDataPoint, Project, PromptVersionStatus } from "./types"
import { promptApi } from "@/api/prompt"
import { projectApi } from "@/api/project"

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromptsPage() {
  const { t } = useTranslation()

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [pipelinePrompts, setPipelinePrompts] = useState<Record<string, Prompt[]>>({})
  const [versionDetails, setVersionDetails] = useState<Record<string, PromptVersion>>({})
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("performance")

  // ── Load projects on mount ──────────────────────────────────────────────────
  useEffect(() => {
    projectApi.getAllProjects().then((res) => {
      const data = res.data.data
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Project[] = data.map((p) => ({
          id: String(p.projectId),
          name: p.projectName,
          description: p.description,
        }))
        setProjects(mapped)
        setSelectedProjectId(mapped[0].id)
      }
    }).catch(() => {/* silent */})
  }, [])

  // ── Load pipelines when project changes ────────────────────────────────────
  const loadPipelines = useCallback((projectId: string) => {
    promptApi.listPipelines(Number(projectId))
      .then(setPipelines)
      .catch(() => setPipelines([]))
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    loadPipelines(selectedProjectId)
    setPerformanceData([])
    promptApi.getPerformanceData(Number(selectedProjectId))
      .then(setPerformanceData)
      .catch(() => {/* backend not ready yet */})
    setSelectedPipelineId(null)
    setSelectedPromptId(null)
    setSelectedVersionId(null)
    setPipelinePrompts({})
    setVersionDetails({})
  }, [selectedProjectId, loadPipelines])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
  }

  const handleSelectPipeline = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId)
    setSelectedPromptId(null)
    setSelectedVersionId(null)
    if (!pipelinePrompts[pipelineId]) {
      promptApi.listPipelinePrompts(pipelineId)
        .then((prompts) => setPipelinePrompts((prev) => ({ ...prev, [pipelineId]: prompts })))
        .catch(() => setPipelinePrompts((prev) => ({ ...prev, [pipelineId]: [] })))
    }
  }

  const handleSelectPrompt = (pipelineId: string, promptId: string) => {
    setSelectedPipelineId(pipelineId)
    setSelectedPromptId(promptId)
    setSelectedVersionId(null)
  }

  const handleSelectVersion = (pipelineId: string, promptId: string, versionId: string) => {
    setSelectedPipelineId(pipelineId)
    setSelectedPromptId(promptId)
    setSelectedVersionId(versionId)
    if (!versionDetails[versionId]) {
      promptApi.getVersionDetail(versionId)
        .then((detail) => setVersionDetails((prev) => ({ ...prev, [versionId]: detail })))
        .catch(() => {/* leave null — right panel stays on chart */})
    }
  }

  const handleSetPipelineStatus = async (pipelineId: string, status: "active" | "archived") => {
    // Optimistic update
    setPipelines((prev) => prev.map((p) => (p.id === pipelineId ? { ...p, status } : p)))
    try {
      await promptApi.updatePipelineStatus(pipelineId, status)
    } catch {
      // Revert on failure
      if (selectedProjectId) loadPipelines(selectedProjectId)
    }
  }

  const handleSetVersionStatus = async (
    _pipelineId: string,
    _promptId: string,
    versionId: string,
    _status: PromptVersionStatus
  ) => {
    try {
      await promptApi.updatePromptStatus(versionId, _status)
    } catch {
      if (selectedProjectId) loadPipelines(selectedProjectId)
    }
  }

  const handleAddPipeline = async (name: string, projectId: string) => {
    try {
      await promptApi.createPipeline({ project_id: Number(projectId), name })
      loadPipelines(projectId)
    } catch {/* silent */}
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const projectPipelines = pipelines.filter((p) => p.projectId === selectedProjectId)
  const selectedPipeline = projectPipelines.find((p) => p.id === selectedPipelineId) ?? null
  const selectedPrompt = selectedPipelineId && selectedPromptId
    ? (() => {
        const p = (pipelinePrompts[selectedPipelineId] ?? []).find((p) => p.id === selectedPromptId) ?? null
        if (!p) return null
        return { ...p, versions: p.versions.map((v) => versionDetails[v.id] ?? v) }
      })()
    : null
  const selectedVersion = selectedVersionId ? (versionDetails[selectedVersionId] ?? null) : null

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
          <Select value={selectedProjectId ?? ""} onValueChange={handleSelectProject}>
            <SelectTrigger className="h-9 w-[220px] text-sm">
              <SelectValue placeholder={t("prompts.selectProject")} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
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
            recommendations={[]}
            selectedId={null}
            onSelect={() => {}}
          />
          <div className="px-3 py-2 flex items-center gap-2">
            <GitBranch className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">{t("prompts.pipeline.title")}</span>
          </div>
          <div className="flex-1 px-2 pb-2 min-h-0 overflow-hidden">
            <PipelineTree
              pipelines={projectPipelines}
              pipelinePrompts={pipelinePrompts}
              selectedPipelineId={selectedPipelineId}
              selectedPromptId={selectedPromptId}
              selectedVersionId={selectedVersionId}
              onSelectPipeline={handleSelectPipeline}
              onSelectPrompt={handleSelectPrompt}
              onSelectVersion={handleSelectVersion}
              onSetPipelineStatus={handleSetPipelineStatus}
              onSetVersionStatus={handleSetVersionStatus}
              onAddPipeline={handleAddPipeline}
              projectId={selectedProjectId ?? ""}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 pl-4 overflow-hidden">

          {versionSelected ? (
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
                    performanceData={performanceData}
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
                  performanceData={performanceData}
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
