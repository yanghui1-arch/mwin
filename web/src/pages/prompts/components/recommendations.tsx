import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "react-i18next"
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecommendedCombination, Pipeline, ConfidenceLevel } from "../types"

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const { t } = useTranslation()
  const styles: Record<ConfidenceLevel, string> = {
    high: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8",
    medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/8",
    low: "border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/8",
  }
  return (
    <Badge variant="outline" className={cn("h-5 px-2 text-[11px]", styles[level])}>
      {t(`prompts.recommendations.${level}`)} {t("prompts.recommendations.confidence")}
    </Badge>
  )
}

function RecommendationCard({
  rec,
  pipelines,
}: {
  rec: RecommendedCombination
  pipelines: Pipeline[]
}) {
  const { t } = useTranslation()

  const involvedPipelines = pipelines.filter((p) => rec.pipelineIds.includes(p.id))

  return (
    <Card className="border-border/60 flex flex-col transition-shadow hover:shadow-md dark:hover:shadow-none dark:hover:border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-snug">{rec.title}</CardTitle>
            <CardDescription className="text-xs mt-1 leading-relaxed">{rec.description}</CardDescription>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{rec.estimatedImprovement}%
              </span>
            </div>
            <ConfidenceBadge level={rec.confidence} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col gap-3 flex-1">
        <p className="text-xs text-foreground/75 leading-relaxed">{rec.rationale}</p>

        <div className="flex flex-wrap gap-1.5">
          {involvedPipelines.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted/60 border border-border/60 text-foreground/70"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: p.chartColor }}
              />
              {p.name}
            </span>
          ))}
        </div>

        {rec.tradeoffs.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                {t("prompts.recommendations.tradeoffs")}
              </span>
            </div>
            <ul className="space-y-0.5">
              {rec.tradeoffs.map((t_, i) => (
                <li key={i} className="text-[11px] text-amber-700/80 dark:text-amber-300/80 pl-2">
                  • {t_}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 w-full">
            {t("prompts.recommendations.explore")}
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface RecommendationsProps {
  recommendations: RecommendedCombination[]
  pipelines: Pipeline[]
}

export function Recommendations({ recommendations, pipelines }: RecommendationsProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center size-7 rounded-lg bg-primary/8 border border-primary/20">
          <Sparkles className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("prompts.recommendations.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("prompts.recommendations.description")}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="size-3.5" />
          <span>{t("prompts.recommendations.analyzed", { count: recommendations.length })}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} pipelines={pipelines} />
        ))}
      </div>
    </div>
  )
}
