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

const PIPELINE_COLORS = ["#C96442", "#9C7BB5", "#5A9E92", "#C9954A", "#B86070"]

// ─── Version item (level 3) ──────────────────────────────────────────────────

function VersionItem({
  version,
  isSelected,
  onClick,
  onSetStatus,
}: {
  version: PromptVersion
  isSelected: boolean
  onClick: () => void
  onSetStatus: (status: PromptVersionStatus) => void
}) {
  return (
    <div className="group/ver flex items-center gap-0.5">
      <button
        onClick={onClick}
        className={cn(
          "flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors overflow-hidden min-w-0",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-primary/8 text-primary"
        )}
      >
        <span className={cn(
          "size-1.5 rounded-full shrink-0",
          version.status === "current" ? "bg-emerald-500" : "bg-muted-foreground/35"
        )} />
        <span className={cn("text-sm font-mono flex-1 min-w-0 truncate", isSelected && "font-semibold")}>
          {version.version}
        </span>
        {version.status === "current" && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 shrink-0">
            Current
          </Badge>
        )}
        {version.status === "testing" && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/8 shrink-0">
            Test
          </Badge>
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 opacity-0 group-hover/ver:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground transition-opacity"
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
}: {
  prompt: Prompt
  isSelected: boolean
  selectedVersionId: string | null
  onSelectPrompt: () => void
  onSelectVersion: (versionId: string) => void
  onSetVersionStatus: (versionId: string, status: PromptVersionStatus) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const currentVersion = prompt.versions.find((v) => v.status === "current")

  const sortedVersions = [...prompt.versions].sort((a, b) => {
    if (a.status === "current") return -1
    if (b.status === "current") return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div>
      <button
        onClick={() => { setExpanded(!expanded); onSelectPrompt() }}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors overflow-hidden",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected && !selectedVersionId && "bg-accent text-accent-foreground"
        )}
      >
        <FileText className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{prompt.name}</span>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums font-mono">
          {currentVersion?.version ?? "—"}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </span>
      </button>

      {expanded && (
        <div className="ml-5 pl-2 border-l border-border/50 mt-0.5 mb-1 space-y-0.5 overflow-hidden">
          {sortedVersions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isSelected={selectedVersionId === version.id}
              onClick={() => onSelectVersion(version.id)}
              onSetStatus={(status) => onSetVersionStatus(version.id, status)}
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
}) {
  const [expanded, setExpanded] = useState(pipeline.status === "active")
  const totalVersions = pipeline.versionCount

  return (
    <div className="group/pipe">
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => { setExpanded(!expanded); onSelectPipeline(pipeline.id) }}
          className={cn(
            "flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors overflow-hidden min-w-0",
            "hover:bg-accent hover:text-accent-foreground",
            isSelected && !selectedPromptId && "bg-accent text-accent-foreground"
          )}
        >
          <span className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </span>
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{pipeline.name}</span>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {pipeline.promptCount}p · {totalVersions}v
          </span>
        </button>

        <button
          className="shrink-0 opacity-0 group-hover/pipe:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground/60 hover:text-muted-foreground transition-opacity"
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
        <div className="ml-3 pl-2 border-l border-border/30 mt-0.5 mb-1 space-y-0.5">
          {prompts.map((prompt) => (
            <PromptItem
              key={prompt.id}
              prompt={prompt}
              isSelected={selectedPromptId === prompt.id}
              selectedVersionId={selectedPromptId === prompt.id ? selectedVersionId : null}
              onSelectPrompt={() => onSelectPrompt(pipeline.id, prompt.id)}
              onSelectVersion={(versionId) => onSelectVersion(pipeline.id, prompt.id, versionId)}
              onSetVersionStatus={(versionId, status) => onSetVersionStatus(prompt.id, versionId, status)}
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
            <Zap className="size-3.5 text-chart-1" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("prompts.pipeline.active")}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{active.length}</span>
            <button
              onClick={() => setAddOpen(true)}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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
            />
          ))}

          {archived.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2.5 pb-1 flex items-center gap-1.5">
                <Archive className="size-3.5 text-muted-foreground/60" />
                <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  {t("prompts.pipeline.archived")}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/60">{archived.length}</span>
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
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
