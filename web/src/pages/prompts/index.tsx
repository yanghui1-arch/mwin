import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { GitBranch } from "lucide-react"
import { PipelineTree } from "./components/pipeline-tree"
import { PerformanceChart } from "./components/performance-chart"
import { PromptDetail } from "./components/prompt-detail"
import { CompactRecommendations } from "./components/compact-recommendations"
import { VersionLoadingSkeleton } from "./components/version-loading-skeleton"
import { PageLoadingSkeleton } from "./components/page-loading-skeleton"
import { CreatePromptDialog, type CreatePromptForm } from "./components/create-prompt-dialog"
import { PromptsPageHeader } from "./components/prompts-page-header"
import { VersionDetailHeader } from "./components/version-detail-header"
import type { PromptViewMode } from "./components/view-toggle"
import type { Pipeline, Prompt, PromptVersion, PerformanceDataPoint, Project, PromptVersionStatus } from "./types"
import { promptApi } from "@/api/prompt"
import { projectApi } from "@/api/project"
import { buildPromptIdentifier } from "./utils"


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
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<PromptViewMode>("performance")
  const [pageLoading, setPageLoading] = useState(true)

  const [createPromptOpen, setCreatePromptOpen] = useState(false)
  const [createPromptLoading, setCreatePromptLoading] = useState(false)
  const [createPromptCopied, setCreatePromptCopied] = useState(false)
  const [createPromptError, setCreatePromptError] = useState<string | null>(null)
  const [createdPromptIdentifier, setCreatedPromptIdentifier] = useState<string | null>(null)
  const [createPromptForm, setCreatePromptForm] = useState<CreatePromptForm>({
    pipelineId: "",
    name: "",
    version: "",
    content: "",
  })

  const [copiedPerformanceIdentifier, setCopiedPerformanceIdentifier] = useState(false)

  // Load projects on mount
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
    }).catch(() => {/* silent */}).finally(() => setPageLoading(false))
  }, [])

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
      setLoadingVersionId(versionId)
      promptApi.getVersionDetail(versionId)
        .then((detail) => {
          setVersionDetails((prev) => ({ ...prev, [versionId]: detail }))
          setLoadingVersionId(null)
        })
        .catch(() => setLoadingVersionId(null))
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
    pipelineId: string,
    promptId: string,
    versionId: string,
    status: PromptVersionStatus
  ) => {
    // IDs of all versions in the same prompt group (needed to demote siblings)
    const siblingIds = new Set(
      (pipelinePrompts[pipelineId] ?? [])
        .find((p) => p.id === promptId)?.versions.map((v) => v.id) ?? []
    )

    const resolveStatus = (currentStatus: PromptVersionStatus, id: string): PromptVersionStatus =>
      id === versionId ? status
      : status === "current" && currentStatus === "current" && siblingIds.has(id) ? "deprecated"
      : currentStatus

    // Optimistic update: pipelinePrompts
    setPipelinePrompts((prev) => {
      const prompts = prev[pipelineId]
      if (!prompts) return prev
      return {
        ...prev,
        [pipelineId]: prompts.map((p) =>
          p.id !== promptId ? p : {
            ...p,
            versions: p.versions.map((v) => ({ ...v, status: resolveStatus(v.status, v.id) })),
          }
        ),
      }
    })

    // Optimistic update: versionDetails (for any cached full versions)
    setVersionDetails((prev) => {
      const updated = { ...prev }
      siblingIds.forEach((id) => {
        if (updated[id]) updated[id] = { ...updated[id], status: resolveStatus(updated[id].status, id) }
      })
      return updated
    })

    try {
      await promptApi.updatePromptStatus(versionId, status)
    } catch {
      // Revert: reload prompt list for this pipeline
      promptApi.listPipelinePrompts(pipelineId)
        .then((prompts) => setPipelinePrompts((prev) => ({ ...prev, [pipelineId]: prompts })))
        .catch(() => {})
    }
  }

  const handleAddPipeline = async (name: string, projectId: string) => {
    try {
      await promptApi.createPipeline({ project_id: Number(projectId), name })
      loadPipelines(projectId)
    } catch {/* silent */}
  }

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
  const versionLoading = !!(selectedVersionId && loadingVersionId === selectedVersionId && !selectedVersion)
  const identifierVersion = selectedPrompt
    ? (selectedVersion
      ?? selectedPrompt.versions.find((v) => v.status === "current")
      ?? selectedPrompt.versions[0]
      ?? null)
    : null
  const selectedPromptIdentifier = (selectedPipeline && selectedPrompt && identifierVersion)
    ? buildPromptIdentifier(selectedPipeline.name, selectedPrompt.name, identifierVersion.version)
    : null

  const canCreatePrompt =
    !!createPromptForm.pipelineId &&
    !!createPromptForm.name.trim() &&
    !!createPromptForm.version.trim() &&
    !!createPromptForm.content.trim()

  useEffect(() => {
    setCopiedPerformanceIdentifier(false)
  }, [selectedPromptIdentifier])

  const openCreatePromptDialog = () => {
    const defaultPipelineId =
      (selectedPipelineId && projectPipelines.some((p) => p.id === selectedPipelineId))
        ? selectedPipelineId
        : (projectPipelines[0]?.id ?? "")

    setCreatePromptError(null)
    setCreatedPromptIdentifier(null)
    setCreatePromptCopied(false)
    setCreatePromptLoading(false)
    setCreatePromptForm({
      pipelineId: defaultPipelineId,
      name: "",
      version: "",
      content: "",
    })
    setCreatePromptOpen(true)
  }

  const handleCreatePromptDialogChange = (open: boolean) => {
    setCreatePromptOpen(open)
    if (!open) {
      setCreatePromptLoading(false)
    }
  }

  const handleCreatePrompt = async () => {
    if (!canCreatePrompt) return

    const pipelineId = createPromptForm.pipelineId
    const promptName = createPromptForm.name.trim()
    const version = createPromptForm.version.trim()
    const content = createPromptForm.content

    const pipeline = projectPipelines.find((p) => p.id === pipelineId)
    if (!pipeline) return

    setCreatePromptLoading(true)
    setCreatePromptError(null)

    try {
      const createRes = await promptApi.createPrompt({
        prompt_pipeline_id: pipelineId,
        name: promptName,
        version,
        content,
      })

      const createdVersionId = String(createRes.data.data)
      const prompts = await promptApi.listPipelinePrompts(pipelineId)
      setPipelinePrompts((prev) => ({ ...prev, [pipelineId]: prompts }))

      if (selectedProjectId) {
        loadPipelines(selectedProjectId)
      }

      const createdPrompt = prompts.find((p) => p.name === promptName) ?? null
      const createdVersion = createdPrompt
        ? (createdPrompt.versions.find((v) => v.id === createdVersionId)
          ?? createdPrompt.versions.find((v) => v.version === version)
          ?? null)
        : null

      setSelectedPipelineId(pipelineId)
      setSelectedPromptId(createdPrompt?.id ?? null)

      if (createdVersion) {
        setSelectedVersionId(createdVersion.id)
        setLoadingVersionId(createdVersion.id)
        try {
          const detail = await promptApi.getVersionDetail(createdVersion.id)
          setVersionDetails((prev) => ({ ...prev, [createdVersion.id]: detail }))
        } catch {
          // ignore; list item still visible in tree
        } finally {
          setLoadingVersionId(null)
        }
      } else {
        setSelectedVersionId(null)
        setLoadingVersionId(null)
      }

      setViewMode("performance")
      setCreatedPromptIdentifier(buildPromptIdentifier(pipeline.name, promptName, version))
    } catch {
      setCreatePromptError(t("prompts.createPrompt.createFailed"))
    } finally {
      setCreatePromptLoading(false)
    }
  }

  const handleCopyCreatedIdentifier = async () => {
    if (!createdPromptIdentifier) return
    await navigator.clipboard.writeText(createdPromptIdentifier)
    setCreatePromptCopied(true)
    setTimeout(() => setCreatePromptCopied(false), 2000)
  }

  const handleCopyPerformanceIdentifier = async () => {
    if (!selectedPromptIdentifier) return
    await navigator.clipboard.writeText(selectedPromptIdentifier)
    setCopiedPerformanceIdentifier(true)
    setTimeout(() => setCopiedPerformanceIdentifier(false), 2000)
  }

  const renderPerformancePanel = () => (
    <div className="flex-1 min-h-0 rounded-xl bg-[#faf9f6] px-5 py-4">
      <PerformanceChart
        pipelines={projectPipelines}
        performanceData={performanceData}
        selectedPipeline={selectedPipeline}
        selectedPrompt={selectedPrompt}
        selectedVersionId={selectedVersionId}
      />
    </div>
  )

  if (pageLoading) return <PageLoadingSkeleton />

  return (
    <>
      <CreatePromptDialog
        open={createPromptOpen}
        loading={createPromptLoading}
        copied={createPromptCopied}
        error={createPromptError}
        createdIdentifier={createdPromptIdentifier}
        form={createPromptForm}
        pipelines={projectPipelines}
        canCreate={canCreatePrompt}
        onOpenChange={handleCreatePromptDialogChange}
        onFormChange={(next) => setCreatePromptForm(next)}
        onCreate={handleCreatePrompt}
        onCopyCreatedIdentifier={handleCopyCreatedIdentifier}
      />

      <div className="px-4 lg:px-6 space-y-4">
        {/* Header */}
        <PromptsPageHeader
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onOpenCreatePrompt={openCreatePromptDialog}
        />

        {/* Main Content */}
        <div className="flex gap-3 h-[calc(100vh-12rem)] min-h-[500px]">
          {/* Left Panel */}
          <div className="w-[260px] shrink-0 flex flex-col overflow-hidden rounded-xl border border-[#e0ddd6] bg-[#f5f4ed]">
            <CompactRecommendations
              recommendations={[]}
              selectedId={null}
              onSelect={() => {}}
            />
            <div className="px-3 py-2 flex items-center gap-2">
              <GitBranch className="size-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("prompts.pipeline.title")}</span>
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
          <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 overflow-hidden rounded-xl bg-white px-5 py-4">

            {versionSelected ? (
              /* ── Version selected: header row + detail ── */
              <>
                <VersionDetailHeader
                  selectedPipeline={selectedPipeline!}
                  selectedPrompt={selectedPrompt!}
                  selectedVersion={selectedVersion!}
                  viewMode={viewMode}
                  selectedPromptIdentifier={selectedPromptIdentifier}
                  copiedPerformanceIdentifier={copiedPerformanceIdentifier}
                  onCopyPerformanceIdentifier={handleCopyPerformanceIdentifier}
                  onChangeViewMode={setViewMode}
                />

                {viewMode === "performance" ? (
                  renderPerformancePanel()
                ) : (
                  <PromptDetail version={selectedVersion!} />
                )}
              </>
            ) : versionLoading ? (
              /* ── Version loading: skeleton ── */
              <VersionLoadingSkeleton />
            ) : (
              /* ── Nothing selected: chart ── */
              renderPerformancePanel()
            )}
          </div>
        </div>
      </div>
    </>
  )
}
