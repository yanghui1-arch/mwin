import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecommendedCombination, Pipeline, ConfidenceLevel } from "../types"

const confidenceStyle: Record<ConfidenceLevel, string> = {
  high: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/8",
  low: "border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/8",
}

interface RecommendationDetailProps {
  recommendation: RecommendedCombination
  pipelines: Pipeline[]
}

export function RecommendationDetail({ recommendation: rec, pipelines }: RecommendationDetailProps) {
  const { t } = useTranslation()

  const involvedPipelines = pipelines.filter((p) => rec.pipelineIds.includes(p.id))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {t("prompts.recommendations.title")}
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-snug">{rec.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
        </div>
        <div className="shrink-0 text-right space-y-1.5">
          <div className="flex items-center gap-1 justify-end">
            <TrendingUp className="size-4 text-emerald-500" />
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{rec.estimatedImprovement}%
            </span>
          </div>
          <Badge variant="outline" className={cn("text-xs", confidenceStyle[rec.confidence])}>
            {t(`prompts.recommendations.${rec.confidence}`)} {t("prompts.recommendations.confidence")}
          </Badge>
        </div>
      </div>

      {/* Rationale */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("prompts.recommendations.rationale")}
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">{rec.rationale}</p>
      </div>

      {/* Involved Pipelines */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("prompts.recommendations.involvedPipelines")}
        </p>
        <div className="flex flex-wrap gap-2">
          {involvedPipelines.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium bg-muted/50 border border-border/60"
            >
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: p.chartColor }} />
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* Trade-offs */}
      {rec.tradeoffs.length > 0 && (
        <div className="rounded-lg bg-amber-500/8 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              {t("prompts.recommendations.tradeoffs")}
            </span>
          </div>
          <ul className="space-y-1">
            {rec.tradeoffs.map((tradeoff, i) => (
              <li key={i} className="text-sm text-amber-700/80 dark:text-amber-300/80 pl-1">
                • {tradeoff}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button size="sm" variant="outline" className="gap-1.5">
        {t("prompts.recommendations.explore")}
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  )
}
