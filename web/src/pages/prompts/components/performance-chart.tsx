import { useMemo, useState } from "react"
import { Area, AreaChart, Line, LineChart, Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { useTranslation } from "react-i18next"
import type { Pipeline, Prompt, PerformanceDataPoint, MetricKey } from "../types"

const METRIC_OPTIONS: { value: MetricKey; labelKey: string }[] = [
  { value: "successRate",    labelKey: "prompts.chart.successRate" },
  { value: "latencyMs",      labelKey: "prompts.chart.latency"     },
  { value: "tokenCostPer1k", labelKey: "prompts.chart.tokenCost"   },
]

function fmtVal(metric: MetricKey, v: number): string {
  if (metric === "latencyMs")      return `${v}ms`
  if (metric === "tokenCostPer1k") return `${v}¢`
  return `${Number(v).toFixed(1)}%`
}

// ─── Overview: all pipelines success rate over time ──────────────────────────

function OverviewChart({
  pipelines,
  performanceData,
}: {
  pipelines: Pipeline[]
  performanceData: PerformanceDataPoint[]
}) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    pipelines.forEach((p) => { config[p.id] = { label: p.name, color: p.chartColor } })
    return config
  }, [pipelines])

  const activePipelines = pipelines.filter((p) => p.status === "active")

  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={performanceData} margin={{ top: 18, right: 16, left: -10, bottom: 0 }}>
        <defs>
          {activePipelines.map((p) => (
            <linearGradient key={p.id} id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={p.chartColor} stopOpacity={0.18} />
              <stop offset="95%" stopColor={p.chartColor} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => `${v}%`} />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs space-y-1">
                <p className="text-muted-foreground font-medium mb-1.5">{label}</p>
                {payload.map((entry) => (
                  <div key={String(entry.dataKey)} className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-foreground/70 truncate max-w-[130px]">{entry.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{Number(entry.value).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        {activePipelines.map((p) => (
          <Area key={p.id} type="monotone" dataKey={p.id} name={p.name}
            stroke={p.chartColor} strokeWidth={2}
            fill={`url(#grad-${p.id})`}
            dot={{ r: 3, strokeWidth: 0, fill: p.chartColor }}
            activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

// ─── Prompt detail: two charts for one named prompt ──────────────────────────

function PromptDetailCharts({
  pipeline,
  prompt,
  selectedVersionId,
}: {
  pipeline: Pipeline
  prompt: Prompt
  selectedVersionId: string | null
}) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<MetricKey>("successRate")
  const metricOption = METRIC_OPTIONS.find((m) => m.value === metric)!

  const displayVersion =
    prompt.versions.find((v) => v.id === selectedVersionId) ??
    prompt.versions.find((v) => v.status === "current") ??
    prompt.versions[0]

  const historyData = (displayVersion?.performanceHistory ?? []).map((pt) => ({
    date: pt.date,
    value: pt[metric],
  }))

  const avgData = [...prompt.versions]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((v) => ({
      version: v.version,
      value: v.metrics?.[metric] ?? 0,
      isCurrent: v.status === "current",
      isSelected: v.id === selectedVersionId,
    }))

  const chartConfig: ChartConfig = {
    value: { label: t(metricOption.labelKey), color: pipeline.chartColor },
  }

  const yDomainLine: [number | string, number | string] =
    metric === "successRate" && historyData.length > 0
      ? [Math.max(60, Math.floor(Math.min(...historyData.map((d) => d.value)) - 3)), 100]
      : ["auto", "auto"]

  const yDomainBar: [number | string, number | string] = (() => {
    if (!avgData.length) return ["auto", "auto"]
    const vals = avgData.map((d) => d.value)
    const min = Math.min(...vals), max = Math.max(...vals)
    if (max === 0) return ["auto", "auto"]
    if (metric === "successRate") return [Math.max(60, Math.floor(min - 4)), Math.ceil(max + 1)]
    if (metric === "latencyMs")   return [Math.max(0, Math.floor(min * 0.9)), Math.ceil(max * 1.05)]
    return [Math.max(0, Math.floor(min * 0.85)), Math.ceil(max * 1.1)]
  })()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {t("prompts.chart.showing")}:{" "}
          <span className="font-mono font-semibold text-foreground">{displayVersion?.version}</span>
        </p>
        <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
          <SelectTrigger size="sm" className="h-7 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {t(m.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: version over time (curve) */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("prompts.chart.versionTimeline")}</p>
          {historyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[175px] w-full">
              <LineChart data={historyData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis domain={yDomainLine} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => fmtVal(metric, v)} />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-lg border border-border bg-popover px-2.5 py-2 shadow-md text-xs">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="font-semibold tabular-nums mt-0.5">{fmtVal(metric, payload[0].value as number)}</p>
                      </div>
                    )
                  }}
                />
                <Line type="monotone" dataKey="value" stroke={pipeline.chartColor} strokeWidth={2}
                  dot={{ r: 3, fill: pipeline.chartColor, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)", fill: pipeline.chartColor }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[175px] flex items-center justify-center text-xs text-muted-foreground">
              {t("prompts.chart.noHistory")}
            </div>
          )}
        </div>

        {/* Right: average by version (thin bars) */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("prompts.chart.avgPerformance")}</p>
          <ChartContainer config={chartConfig} className="h-[175px] w-full">
            <BarChart data={avgData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis dataKey="version" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
              <YAxis domain={yDomainBar} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => fmtVal(metric, v)} />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-border bg-popover px-2.5 py-2 shadow-md text-xs">
                      <p className="font-mono font-semibold">{label}</p>
                      <p className="tabular-nums mt-0.5">{fmtVal(metric, payload[0].value as number)}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {avgData.map((entry, idx) => (
                  <Cell key={idx} fill={pipeline.chartColor}
                    fillOpacity={selectedVersionId == null ? (entry.isCurrent ? 1 : 0.4) : (entry.isSelected ? 1 : 0.3)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Public component ────────────────────────────────────────────────────────

interface PerformanceChartProps {
  pipelines: Pipeline[]
  performanceData: PerformanceDataPoint[]
  selectedPipeline: Pipeline | null
  selectedPrompt: Prompt | null
  selectedVersionId: string | null
}

export function PerformanceChart({
  pipelines,
  performanceData,
  selectedPipeline,
  selectedPrompt,
  selectedVersionId,
}: PerformanceChartProps) {
  const { t } = useTranslation()

  const title = selectedPrompt
    ? selectedPrompt.name
    : selectedPipeline
    ? selectedPipeline.name
    : t("prompts.chart.title")

  const description = selectedPrompt
    ? selectedPrompt.description
    : t("prompts.chart.description")

  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      <div className="mt-4">
        {selectedPrompt && selectedPipeline ? (
          <PromptDetailCharts
            pipeline={selectedPipeline}
            prompt={selectedPrompt}
            selectedVersionId={selectedVersionId}
          />
        ) : (
          <OverviewChart pipelines={pipelines} performanceData={performanceData} />
        )}
      </div>
    </div>
  )
}
