"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { OverviewTokenCurve } from "@/api/overview"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export const description = "An interactive area chart"

type TimeRange = "1d" | "7d" | "30d"

type ProjectOption = {
  projectId: number
  projectName: string
}

type ChartAreaInteractiveProps = {
  curve: OverviewTokenCurve | null
  loading: boolean
  timeRange: TimeRange
  onTimeRangeChange: (value: TimeRange) => void
  projectOptions: ProjectOption[]
  selectedProjectIds: number[]
  onSelectedProjectIdsChange: (value: number[]) => void
}

type ChartRow = {
  bucketStart: string
} & Record<string, string | number>

const PROJECT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function formatXAxisLabel(value: string, granularity: "hour" | "day") {
  const date = new Date(value)
  if (granularity === "hour") {
    return date.toLocaleTimeString("en-US", { hour: "numeric" })
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTooltipLabel(value: string, granularity: "hour" | "day") {
  const date = new Date(value)
  if (granularity === "hour") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTokenValue(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function getSeriesKey(projectId: number) {
  return `project-${projectId}`
}

function OverviewChartTooltip({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean
  payload?: Array<{
    color?: string
    dataKey?: string | number
    name?: string
    value?: number | string
  }>
  label?: string | number
  granularity: "hour" | "day"
}) {
  if (!active || !payload?.length || typeof label !== "string") {
    return null
  }

  const visiblePayload = payload.filter((item) => typeof item.value === "number")
  if (!visiblePayload.length) {
    return null
  }

  return (
    <div className="border-border/50 bg-background grid min-w-[12rem] gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{formatTooltipLabel(label, granularity)}</div>
      <div className="grid gap-1.5">
        {visiblePayload.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-mono font-medium tabular-nums">
              {formatTokenValue(Number(item.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartAreaInteractive({
  curve,
  loading,
  timeRange,
  onTimeRangeChange,
  projectOptions,
  selectedProjectIds,
  onSelectedProjectIdsChange,
}: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const { t } = useTranslation()

  React.useEffect(() => {
    if (isMobile && timeRange === "30d") {
      onTimeRangeChange("7d")
    }
  }, [isMobile, onTimeRangeChange, timeRange])

  const allProjectsSelected = selectedProjectIds.length === 0
  const selectedProjectLabel = allProjectsSelected
    ? t("overview.chart.allProjects")
    : t("overview.chart.selectedProjects", { count: selectedProjectIds.length })

  const visibleProjectIds = React.useMemo(
    () => (curve?.projectIds.length ? curve.projectIds : selectedProjectIds),
    [curve?.projectIds, selectedProjectIds]
  )

  const projectConfigEntries = React.useMemo<[string, { label: string; color: string }][]>(
    () => projectOptions
      .filter((project) => visibleProjectIds.includes(project.projectId))
      .map((project, index) => [
        getSeriesKey(project.projectId),
        {
          label: project.projectName,
          color: PROJECT_COLORS[index % PROJECT_COLORS.length],
        },
      ]),
    [projectOptions, visibleProjectIds]
  )

  const chartConfig = React.useMemo(
    () => Object.fromEntries(projectConfigEntries) satisfies ChartConfig,
    [projectConfigEntries]
  )

  const chartData = React.useMemo<ChartRow[]>(() => {
    const rows = new Map<string, ChartRow>()

    for (const series of curve?.series ?? []) {
      const key = getSeriesKey(series.projectId)
      for (const point of series.points) {
        const existing = rows.get(point.bucketStart) ?? { bucketStart: point.bucketStart }
        existing[key] = point.tokens
        rows.set(point.bucketStart, existing)
      }
    }

    return Array.from(rows.values()).sort((a, b) => String(a.bucketStart).localeCompare(String(b.bucketStart)))
  }, [curve])

  const hasData = chartData.length > 0 && projectConfigEntries.length > 0

  const toggleProject = (projectId: number, checked: boolean) => {
    if (checked) {
      const nextIds = Array.from(new Set([...selectedProjectIds, projectId]))
      onSelectedProjectIdsChange(nextIds)
      return
    }

    if (allProjectsSelected) {
      onSelectedProjectIdsChange(projectOptions.filter((project) => project.projectId !== projectId).map((project) => project.projectId))
      return
    }

    onSelectedProjectIdsChange(selectedProjectIds.filter((value) => value !== projectId))
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex flex-col gap-4 @[900px]/card:flex-row @[900px]/card:items-start @[900px]/card:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{t("overview.chart.title")}</CardTitle>
            <CardDescription>{t("overview.chart.description")}</CardDescription>
          </div>
          <CardAction className="flex flex-col gap-2 @[900px]/card:items-end">
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(value) => {
                if (value) {
                  onTimeRangeChange(value as TimeRange)
                }
              }}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
            >
              <ToggleGroupItem value="1d">{t("overview.chart.last24Hours")}</ToggleGroupItem>
              <ToggleGroupItem value="7d">{t("chart.last7Days")}</ToggleGroupItem>
              <ToggleGroupItem value="30d">{t("chart.last30Days")}</ToggleGroupItem>
            </ToggleGroup>
            <div className="flex flex-col gap-2 @[767px]/card:flex-row">
              <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
                <SelectTrigger
                  className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                  size="sm"
                  aria-label={t("overview.chart.selectRange")}
                >
                  <SelectValue placeholder={t("chart.last30Days")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectGroup>
                    <SelectItem value="1d" className="rounded-lg">{t("overview.chart.last24Hours")}</SelectItem>
                    <SelectItem value="7d" className="rounded-lg">{t("chart.last7Days")}</SelectItem>
                    <SelectItem value="30d" className="rounded-lg">{t("chart.last30Days")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-between">
                    {selectedProjectLabel}
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t("overview.chart.projectFilter")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {projectOptions.map((project) => (
                      <DropdownMenuCheckboxItem
                        key={project.projectId}
                        checked={allProjectsSelected || selectedProjectIds.includes(project.projectId)}
                        onCheckedChange={(checked) => toggleProject(project.projectId, checked === true)}
                      >
                        {project.projectName}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : hasData ? (
          <ChartContainer
            config={chartConfig}
            className="h-[250px] w-full min-h-[250px]"
          >
            <AreaChart data={chartData} accessibilityLayer>
              <defs>
                {projectConfigEntries.map(([key]) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucketStart"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => formatXAxisLabel(String(value), curve?.granularity ?? "day")}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatTokenValue(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={<OverviewChartTooltip granularity={curve?.granularity ?? "day"} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {projectConfigEntries.map(([key]) => (
                <Area
                  key={key}
                  dataKey={key}
                  name={String(chartConfig[key]?.label ?? key)}
                  type="natural"
                  fill={`url(#fill-${key})`}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className={cn(
            "text-muted-foreground flex h-[250px] items-center justify-center rounded-lg border border-dashed text-sm",
          )}>
            {projectOptions.length === 0
              ? t("overview.chart.noProjects")
              : t("overview.chart.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
