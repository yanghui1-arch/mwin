import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { OverviewSummary } from "@/api/overview"

type SectionCardsProps = {
  summary: OverviewSummary | null
  loading: boolean
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "--"
  }
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function getTrendState(value: number | null) {
  if (value === null) {
    return "neutral"
  }
  return value >= 0 ? "up" : "down"
}

function SummaryCard({
  title,
  value,
  trend,
  footerTitle,
  footerDescription,
  loading,
}: {
  title: string
  value: string
  trend: number | null
  footerTitle: string
  footerDescription: string
  loading: boolean
}) {
  const trendState = getTrendState(trend)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
        )}
        <CardAction>
          {loading ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <Badge variant="outline">
              {trendState === "up" ? <IconTrendingUp /> : trendState === "down" ? <IconTrendingDown /> : null}
              {formatPercentage(trend)}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {footerTitle}
          {trendState === "up" ? <IconTrendingUp className="size-4" /> : trendState === "down" ? <IconTrendingDown className="size-4" /> : null}
        </div>
        <div className="text-muted-foreground">{footerDescription}</div>
      </CardFooter>
    </Card>
  )
}

export function SectionCards({ summary, loading }: SectionCardsProps) {
  const { t } = useTranslation()

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <SummaryCard
        title={t("overview.cards.trackedProjects")}
        value={summary ? String(summary.trackedProjectCount) : "0"}
        trend={null}
        footerTitle={t("overview.cards.trackedProjectsFooterTitle")}
        footerDescription={t("overview.cards.trackedProjectsFooterDescription")}
        loading={loading}
      />
      <SummaryCard
        title={t("overview.cards.lifetimeTokens")}
        value={summary ? formatCompactNumber(summary.lifetimeTotalTokens) : "0"}
        trend={null}
        footerTitle={t("overview.cards.lifetimeTokensFooterTitle")}
        footerDescription={t("overview.cards.lifetimeTokensFooterDescription")}
        loading={loading}
      />
      <SummaryCard
        title={t("overview.cards.yesterdayTokens")}
        value={summary ? formatCompactNumber(summary.yesterdayTotalTokens) : "0"}
        trend={summary?.yesterdayChangePct ?? null}
        footerTitle={t("overview.cards.yesterdayTokensFooterTitle")}
        footerDescription={t("overview.cards.dayOverDay")}
        loading={loading}
      />
      <SummaryCard
        title={t("overview.cards.todayTokens")}
        value={summary ? formatCompactNumber(summary.todayTotalTokens) : "0"}
        trend={summary?.todayChangePct ?? null}
        footerTitle={t("overview.cards.todayTokensFooterTitle")}
        footerDescription={t("overview.cards.dayOverDay")}
        loading={loading}
      />
    </div>
  )
}
