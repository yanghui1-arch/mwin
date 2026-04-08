import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { Pipeline, Prompt, PromptVersion } from "../types"
import { IdentifierBadge } from "./identifier-badge"
import { ViewToggle, type PromptViewMode } from "./view-toggle"

interface VersionDetailHeaderProps {
  selectedPipeline: Pipeline
  selectedPrompt: Prompt
  selectedVersion: PromptVersion
  viewMode: PromptViewMode
  selectedPromptIdentifier: string | null
  copiedPerformanceIdentifier: boolean
  onCopyPerformanceIdentifier: () => void
  onChangeViewMode: (mode: PromptViewMode) => void
}

export function VersionDetailHeader({
  selectedPipeline,
  selectedPrompt,
  selectedVersion,
  viewMode,
  selectedPromptIdentifier,
  copiedPerformanceIdentifier,
  onCopyPerformanceIdentifier,
  onChangeViewMode,
}: VersionDetailHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-4 shrink-0 pb-3 border-b border-[#e0ddd6]">
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-slate-400 shrink-0 truncate max-w-[120px] text-xs">{selectedPipeline.name}</span>
        <ChevronRight className="size-3 shrink-0 text-slate-300" />
        <span className="font-medium text-slate-500 truncate max-w-[140px] text-xs">{selectedPrompt.name}</span>
        <ChevronRight className="size-3 shrink-0 text-slate-300" />
        <span className="font-mono font-semibold text-slate-800 shrink-0 text-sm">{selectedVersion.version}</span>
        <div className="ml-2 shrink-0">
          {selectedVersion.status === "current" && (
            <Badge variant="outline" className="h-5 px-2 text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
              {t("prompts.prompt.current")}
            </Badge>
          )}
          {selectedVersion.status === "deprecated" && (
            <Badge variant="outline" className="h-5 px-2 text-xs bg-slate-100 border-slate-200 text-slate-500">
              {t("prompts.prompt.deprecated")}
            </Badge>
          )}
          {selectedVersion.status === "testing" && (
            <Badge variant="outline" className="h-5 px-2 text-xs bg-amber-50 border-amber-200 text-amber-700">
              {t("prompts.prompt.testing")}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {viewMode === "performance" && selectedPromptIdentifier && (
          <IdentifierBadge
            identifier={selectedPromptIdentifier}
            copied={copiedPerformanceIdentifier}
            onCopy={onCopyPerformanceIdentifier}
          />
        )}
        <ViewToggle value={viewMode} onChange={onChangeViewMode} />
      </div>
    </div>
  )
}
