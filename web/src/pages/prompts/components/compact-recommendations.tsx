import { useTranslation } from "react-i18next"
import { Sparkles, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecommendedCombination, ConfidenceLevel } from "../types"

const confidenceDot: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-400",
  low: "bg-orange-400",
}

interface CompactRecommendationsProps {
  recommendations: RecommendedCombination[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function CompactRecommendations({ recommendations, selectedId, onSelect }: CompactRecommendationsProps) {
  const { t } = useTranslation()
  if (recommendations.length === 0) return null

  return (
    <div className="pb-2">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Sparkles className="size-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          {t("prompts.recommendations.title")}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground/60 tabular-nums font-mono">
          {recommendations.length}
        </span>
      </div>

      <div className="px-2 space-y-0.5">
        {recommendations.map((rec) => (
          <button
            key={rec.id}
            onClick={() => onSelect(rec.id)}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
              "hover:bg-muted/50",
              selectedId === rec.id
                ? "bg-primary/10 ring-1 ring-primary/20"
                : ""
            )}
          >
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="size-3 text-emerald-500/80 shrink-0" />
              <span className={cn(
                "text-xs font-bold tabular-nums w-8",
                selectedId === rec.id ? "text-primary" : "text-emerald-500 dark:text-emerald-400"
              )}>
                +{rec.estimatedImprovement}%
              </span>
            </div>
            <span className="text-xs text-foreground/70 flex-1 truncate leading-snug">{rec.title}</span>
            <span className={cn("size-1.5 rounded-full shrink-0", confidenceDot[rec.confidence])} />
          </button>
        ))}
      </div>
    </div>
  )
}
