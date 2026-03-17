import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslation } from "react-i18next"
import { Copy, Check, Calendar, History, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PromptVersion } from "../types"

function MetricCard({ label, value, sub, quality }: {
  label: string; value: string; sub?: string; quality: "good" | "neutral" | "warn"
}) {
  const color = { good: "text-emerald-400", neutral: "text-foreground", warn: "text-amber-400" }[quality]
  return (
    <div className="rounded-xl bg-muted/30 border border-border/30 px-4 py-3">
      <p className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wide">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums leading-tight", color)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  )
}

function scoreQuality(s: number): "good" | "neutral" | "warn" {
  return s >= 90 ? "good" : s >= 80 ? "neutral" : "warn"
}
function latencyQuality(ms: number): "good" | "neutral" | "warn" {
  return ms <= 250 ? "good" : ms <= 420 ? "neutral" : "warn"
}

interface PromptDetailProps { version: PromptVersion }

export function PromptDetail({ version: prompt }: PromptDetailProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content ?? "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  const formatNumber = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  const cfg = prompt.modelConfig
  const metrics = prompt.metrics

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <Tabs defaultValue="content" className="flex flex-col flex-1 min-h-0">
        <TabsList className="h-9 w-fit rounded-lg bg-muted/40 border border-border/30 p-0.5 mb-4 shrink-0">
          <TabsTrigger value="content" className="h-8 px-4 text-xs gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="size-3" />
            {t("prompts.prompt.content")}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="h-8 px-4 text-xs gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="size-3" />
            {t("prompts.prompt.metrics")}
          </TabsTrigger>
          <TabsTrigger value="history" className="h-8 px-4 text-xs gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="size-3" />
            {t("prompts.prompt.history")}
          </TabsTrigger>
        </TabsList>

        {/* ── Content tab ── */}
        <TabsContent value="content" className="flex-1 min-h-0 mt-0 flex flex-col gap-3">
          {/* System Prompt — label row ABOVE the scroll area */}
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                System Prompt
              </span>
              <Button
                size="sm" variant="ghost"
                className="h-6 px-2.5 text-[11px] gap-1.5 text-muted-foreground/60 hover:text-foreground"
                onClick={handleCopy}
              >
                {copied
                  ? <><Check className="size-3 text-emerald-500" />{t("prompts.prompt.copied")}</>
                  : <><Copy className="size-3" />{t("prompts.prompt.copyContent")}</>
                }
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full rounded-xl bg-muted/20 border border-border/20">
                <pre className="p-4 text-sm font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
                  {prompt.content}
                </pre>
              </ScrollArea>
            </div>
          </div>

          {/* Model Config */}
          {cfg && (
            <div className="rounded-xl bg-muted/20 border border-border/25 px-4 py-3 shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-3">
                Model Configuration
              </p>
              <div className="flex items-stretch gap-0 divide-x divide-border/30">
                <div className="flex flex-col gap-0.5 pr-6">
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Model</span>
                  <span className="text-sm font-mono font-semibold text-foreground/90">{cfg.model}</span>
                </div>
                {cfg.temperature != null && (
                  <div className="flex flex-col gap-0.5 px-6">
                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Temperature</span>
                    <span className="text-sm font-mono font-semibold text-foreground/90">{cfg.temperature}</span>
                  </div>
                )}
                {cfg.topP != null && (
                  <div className="flex flex-col gap-0.5 px-6">
                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Top-P</span>
                    <span className="text-sm font-mono font-semibold text-foreground/90">{cfg.topP}</span>
                  </div>
                )}
                {cfg.topK != null && (
                  <div className="flex flex-col gap-0.5 px-6">
                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Top-K</span>
                    <span className="text-sm font-mono font-semibold text-foreground/90">{cfg.topK}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Metrics tab ── */}
        <TabsContent value="metrics" className="flex-1 min-h-0 mt-0 overflow-y-auto">
          {metrics ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MetricCard label={t("prompts.prompt.successRate")} value={`${metrics.successRate}%`} quality={scoreQuality(metrics.successRate)} />
              <MetricCard label={t("prompts.prompt.latency")} value={`${metrics.latencyMs}`} sub="ms avg" quality={latencyQuality(metrics.latencyMs)} />
              <MetricCard label={t("prompts.prompt.tokenCost")} value={`${metrics.tokenCostPer1k}¢`} sub={t("prompts.prompt.perThousandCalls")} quality="neutral" />
              <MetricCard label={t("prompts.prompt.usageCount")} value={formatNumber(metrics.usageCount)} sub={t("prompts.prompt.totalCalls")} quality="neutral" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-1">{t("prompts.prompt.noMetrics", "No metrics available")}</p>
          )}
        </TabsContent>

        {/* ── History tab ── */}
        <TabsContent value="history" className="flex-1 min-h-0 mt-0 overflow-y-auto">
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-muted/50 p-2">
                <Calendar className="size-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">{t("prompts.prompt.createdAt")}</p>
                <p className="text-sm text-foreground/85 mt-0.5 font-medium">{formatDate(prompt.createdAt)}</p>
              </div>
            </div>

            {prompt.changelog && (
              <div className="rounded-xl bg-muted/20 border border-border/25 px-4 py-3">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
                  {t("prompts.prompt.changelog")}
                </p>
                <p className="text-sm text-foreground/75 leading-relaxed">{prompt.changelog}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
