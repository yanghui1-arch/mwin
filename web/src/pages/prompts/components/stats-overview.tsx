import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import type { Pipeline } from "../types"
import { GitBranch, MessageSquareCode, TrendingUp, CheckCircle2 } from "lucide-react"

interface StatsOverviewProps {
  pipelines: Pipeline[]
}

export function StatsOverview({ pipelines }: StatsOverviewProps) {
  const { t } = useTranslation()

  const activePipelines = pipelines.filter((p) => p.status === "active")
  const archivedPipelines = pipelines.filter((p) => p.status === "archived")

  const avgQuality = "—"
  const bestSuccessRate = "—"

  const stats = [
    {
      icon: GitBranch,
      label: t("prompts.stats.totalPipelines"),
      value: pipelines.length,
      sub: t("prompts.stats.activeArchived", {
        active: activePipelines.length,
        archived: archivedPipelines.length,
      }),
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      icon: MessageSquareCode,
      label: t("prompts.stats.totalPrompts"),
      value: allPrompts.length,
      sub: t("prompts.stats.currentVersions", { count: currentPrompts.length }),
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      icon: TrendingUp,
      label: t("prompts.stats.avgQualityScore"),
      value: avgQuality,
      sub: t("prompts.stats.acrossCurrentVersions"),
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      icon: CheckCircle2,
      label: t("prompts.stats.bestSuccessRate"),
      value: `${bestSuccessRate}%`,
      sub: t("prompts.stats.topPerformingPrompt"),
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium truncate">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="mt-0.5 text-muted-foreground text-xs truncate">{stat.sub}</p>
                </div>
                <div className={`shrink-0 rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`size-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
