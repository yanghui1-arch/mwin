import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "react-i18next"
import {
  ChevronRight, ChevronDown, Archive, ArchiveRestore,
  Zap, FileText, MoreHorizontal, Plus, CheckCircle, MinusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Pipeline, Prompt, PromptVersionStatus } from "../types"

// ─── Version item (level 3) ──────────────────────────────────────────────────

function VersionItem({
  version,
  isSelected,
  onClick,
  onSetStatus,
  pipelineColor,
}: {
  version: PromptVersion
  isSelected: boolean
  onClick: () => void
  onSetStatus: (status: PromptVersionStatus) => void
  pipelineColor: string
}) {
  const statusDotColor =
    version.status === "current" ? "#10b981"
    : version.status === "testing" ? "#f59e0b"
    : undefined

  return (
    <div className="group/ver flex items-center gap-0.5">
      <button
        onClick={onClick}
        className={cn(
          "flex-1 flex items-center gap-2 py-1.5 rounded-md text-left transition-all overflow-hidden min-w-0",
          isSelected
            ? "pl-2 pr-2.5"
            : "px-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
        style={isSelected ? { backgroundColor: `${pipelineColor}1e` } : undefined}
      >
        {isSelected && (
          <span
            className="w-0.5 self-stretch rounded-full shrink-0 -ml-0.5"
            style={{ backgroundColor: pipelineColor }}
          />
        )}
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            !isSelected && !statusDotColor && "bg-slate-300 dark:bg-slate-600"
          )}
          style={{ backgroundColor: isSelected ? pipelineColor : statusDotColor }}
        />
        <span
          className={cn("text-sm font-mono flex-1 min-w-0 truncate", isSelected && "font-semibold")}
          style={isSelected ? { color: pipelineColor } : undefined}
        >
          {version.version}
        </span>
        {version.status === "current" && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-700/50 dark:text-emerald-400 shrink-0">
            Current
          </Badge>
        )}
        {version.status === "testing" && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-700/50 dark:text-amber-400 shrink-0">
            Test
          </Badge>
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 opacity-0 group-hover/ver:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {version.status !== "current" && (
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => onSetStatus("current")}>
              <CheckCircle className="size-3.5 text-emerald-500" />
              Set as Current
            </DropdownMenuItem>
          )}
          {version.status !== "deprecated" && (
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => onSetStatus("deprecated")}>
              <MinusCircle className="size-3.5 text-muted-foreground" />
              Mark Deprecated
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── Prompt item (level 2) ───────────────────────────────────────────────────

function PromptItem({
  prompt,
  isSelected,
  selectedVersionId,
  onSelectPrompt,
  onSelectVersion,
  onSetVersionStatus,
  pipelineColor,
}: {
  prompt: Prompt
  isSelected: boolean
  selectedVersionId: string | null
  onSelectPrompt: () => void
  onSelectVersion: (versionId: string) => void
  onSetVersionStatus: (versionId: string, status: PromptVersionStatus) => void
  pipelineColor: string
}) {
  const [expanded, setExpanded] = useState(true)
  const currentVersion = prompt.versions.find((v) => v.status === "current")

  const sortedVersions = [...prompt.versions].sort((a, b) => {
    if (a.status === "current") return -1
    if (b.status === "current") return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const promptSelected = isSelected && !selectedVersionId

  return (
    <div>
      <button
        onClick={() => { setExpanded(!expanded); onSelectPrompt() }}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors overflow-hidden",
          promptSelected
            ? "font-medium"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
        style={promptSelected ? { backgroundColor: `${pipelineColor}16` } : undefined}
      >
        <FileText
          className="size-3.5 shrink-0"
          style={{ color: promptSelected ? pipelineColor : undefined }}
        />
        <span
          className="text-sm font-medium flex-1 min-w-0 truncate"
          style={promptSelected ? { color: pipelineColor } : undefined}
        >
          {prompt.name}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 tabular-nums font-mono">
          {currentVersion?.version ?? "—"}
        </span>
        <span className="shrink-0 text-slate-400 dark:text-slate-500">
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </span>
      </button>

      {expanded && (
        <div
          className="ml-5 pl-2 border-l mt-0.5 mb-1 space-y-0.5 overflow-hidden"
          style={{ borderLeftColor: `${pipelineColor}40` }}
        >
          {sortedVersions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isSelected={selectedVersionId === version.id}
              onClick={() => onSelectVersion(version.id)}
              onSetStatus={(status) => onSetVersionStatus(version.id, status)}
              pipelineColor={pipelineColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pipeline item (level 1) ─────────────────────────────────────────────────

function PipelineItem({
  pipeline,
  prompts,
  isSelected,
  selectedPromptId,
  selectedVersionId,
  onSelectPipeline,
  onSelectPrompt,
  onSelectVersion,
  onSetPipelineStatus,
  onSetVersionStatus,
  pipelineColor,
}: {
  pipeline: Pipeline
  prompts: Prompt[]
  isSelected: boolean
  selectedPromptId: string | null
  selectedVersionId: string | null
  onSelectPipeline: (id: string) => void
  onSelectPrompt: (pipelineId: string, promptId: string) => void
  onSelectVersion: (pipelineId: string, promptId: string, versionId: string) => void
  onSetPipelineStatus: (status: "active" | "archived") => void
  onSetVersionStatus: (promptId: string, versionId: string, status: PromptVersionStatus) => void
  pipelineColor: string
}) {
  const [expanded, setExpanded] = useState(pipeline.status === "active")
  const totalVersions = pipeline.versionCount
  const pipelineSelected = isSelected && !selectedPromptId

  return (
    <div className="group/pipe">
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => { setExpanded(!expanded); onSelectPipeline(pipeline.id) }}
          className={cn(
            "flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors overflow-hidden min-w-0",
            pipelineSelected
              ? "font-semibold"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          )}
          style={pipelineSelected ? { backgroundColor: `${pipelineColor}16` } : undefined}
        >
          {/* Per-pipeline color dot */}
          <span
            className="shrink-0 size-2 rounded-full"
            style={{
              backgroundColor: pipelineColor,
              opacity: pipeline.status === "archived" ? 0.35 : 0.85,
            }}
          />
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{pipeline.name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 tabular-nums font-mono">
            {pipeline.promptCount}p · {totalVersions}v
          </span>
          <span className="shrink-0 text-slate-400 dark:text-slate-500">
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </span>
        </button>

        <button
          className="shrink-0 opacity-0 group-hover/pipe:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onSetPipelineStatus(pipeline.status === "active" ? "archived" : "active")
          }}
          title={pipeline.status === "active" ? "Archive" : "Restore"}
        >
          {pipeline.status === "active"
            ? <Archive className="size-3.5" />
            : <ArchiveRestore className="size-3.5" />
          }
        </button>
      </div>

      {expanded && prompts.length > 0 && (
        <div
          className="ml-3 pl-2 border-l mt-0.5 mb-1 space-y-0.5"
          style={{ borderLeftColor: `${pipelineColor}35` }}
        >
          {prompts.map((prompt) => (
            <PromptItem
              key={prompt.id}
              prompt={prompt}
              isSelected={selectedPromptId === prompt.id}
              selectedVersionId={selectedPromptId === prompt.id ? selectedVersionId : null}
              onSelectPrompt={() => onSelectPrompt(pipeline.id, prompt.id)}
              onSelectVersion={(versionId) => onSelectVersion(pipeline.id, prompt.id, versionId)}
              onSetVersionStatus={(versionId, status) => onSetVersionStatus(prompt.id, versionId, status)}
              pipelineColor={pipelineColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Public component ────────────────────────────────────────────────────────

interface PipelineTreeProps {
  pipelines: Pipeline[]
  pipelinePrompts: Record<string, Prompt[]>
  selectedPipelineId: string | null
  selectedPromptId: string | null
  selectedVersionId: string | null
  onSelectPipeline: (pipelineId: string) => void
  onSelectPrompt: (pipelineId: string, promptId: string) => void
  onSelectVersion: (pipelineId: string, promptId: string, versionId: string) => void
  onSetPipelineStatus: (pipelineId: string, status: "active" | "archived") => void
  onSetVersionStatus: (pipelineId: string, promptId: string, versionId: string, status: PromptVersionStatus) => void
  onAddPipeline: (name: string, projectId: string) => void
  projectId: string
}

export function PipelineTree({
  pipelines,
  pipelinePrompts,
  selectedPipelineId,
  selectedPromptId,
  selectedVersionId,
  onSelectPipeline,
  onSelectPrompt,
  onSelectVersion,
  onSetPipelineStatus,
  onSetVersionStatus,
  onAddPipeline,
  projectId,
}: PipelineTreeProps) {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")

  const active = pipelines.filter((p) => p.status === "active")
  const archived = pipelines.filter((p) => p.status === "archived")

  const handleSubmit = () => {
    if (!newName.trim()) return
    onAddPipeline(newName.trim(), projectId)
    setNewName("")
    setAddOpen(false)
  }

  return (
    <>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">New Pipeline</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Pipeline name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
            className="h-8 text-sm mt-1"
          />
          <DialogFooter className="mt-2">
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-full overflow-y-auto overflow-x-hidden pr-1">
        <div className="space-y-0.5 py-1">
          <div className="px-2.5 pb-1 flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("prompts.pipeline.active")}
            </span>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 tabular-nums font-mono">{active.length}</span>
            <button
              onClick={() => setAddOpen(true)}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Add pipeline"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {active.map((pipeline) => (
            <PipelineItem
              key={pipeline.id}
              pipeline={pipeline}
              prompts={pipelinePrompts[pipeline.id] ?? []}
              isSelected={selectedPipelineId === pipeline.id}
              selectedPromptId={selectedPipelineId === pipeline.id ? selectedPromptId : null}
              selectedVersionId={selectedPipelineId === pipeline.id ? selectedVersionId : null}
              onSelectPipeline={onSelectPipeline}
              onSelectPrompt={onSelectPrompt}
              onSelectVersion={onSelectVersion}
              onSetPipelineStatus={(status) => onSetPipelineStatus(pipeline.id, status)}
              onSetVersionStatus={(promptId, versionId, status) =>
                onSetVersionStatus(pipeline.id, promptId, versionId, status)
              }
              pipelineColor={pipeline.chartColor}
            />
          ))}

          {archived.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2.5 pb-1 flex items-center gap-1.5">
                <Archive className="size-3.5 text-slate-400 dark:text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t("prompts.pipeline.archived")}
                </span>
                <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 tabular-nums font-mono">{archived.length}</span>
              </div>
              {archived.map((pipeline) => (
                <PipelineItem
                  key={pipeline.id}
                  pipeline={pipeline}
                  prompts={pipelinePrompts[pipeline.id] ?? []}
                  isSelected={selectedPipelineId === pipeline.id}
                  selectedPromptId={selectedPipelineId === pipeline.id ? selectedPromptId : null}
                  selectedVersionId={selectedPipelineId === pipeline.id ? selectedVersionId : null}
                  onSelectPipeline={onSelectPipeline}
                  onSelectPrompt={onSelectPrompt}
                  onSelectVersion={onSelectVersion}
                  onSetPipelineStatus={(status) => onSetPipelineStatus(pipeline.id, status)}
                  onSetVersionStatus={(promptId, versionId, status) =>
                    onSetVersionStatus(pipeline.id, promptId, versionId, status)
                  }
                  pipelineColor={pipeline.chartColor}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
