import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CompletionUsage } from "openai/resources/completions.mjs";
import { useTranslation } from "react-i18next";

export interface TokensPanelProps extends React.ComponentProps<"div"> {
  model?: string;
  usage?: CompletionUsage;
  cost?: number;
  currency?: string;
  title?: string;
  description?: string;
}

function toInt(value: number | null | undefined): number {
  return Number.isFinite(value as number) && (value as number) >= 0
    ? Math.floor(value as number)
    : 0;
}

export function TokensPanel({
  className,
  model,
  usage,
  cost,
  currency = "USD",
  title,
  ...props
}: TokensPanelProps) {
  const { t } = useTranslation()
  const total = React.useMemo(() => toInt(usage?.total_tokens), [usage]);
  const prompt = React.useMemo(() => toInt(usage?.prompt_tokens), [usage]);
  const completion = React.useMemo(
    () => toInt(usage?.completion_tokens) || Math.max(total - prompt, 0),
    [usage, total, prompt]
  );

  const safeTotal = Math.max(total, prompt + completion);
  const promptPct = safeTotal ? Math.round((prompt / safeTotal) * 100) : 0;
  const completionPct = safeTotal
    ? Math.round((completion / safeTotal) * 100)
    : 0;

  const hasUsage = Boolean(safeTotal || prompt || completion);
  const formattedCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 6,
  }).format(cost ?? 0);

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 text-base font-bold leading-none truncate">
          {title ?? t("tokensPanel.title")}
        </div>
        {model ? (
          <Badge variant="secondary" className="font-mono text-xs">
            {model}
          </Badge>
        ) : null}
      </div>

      {hasUsage ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 grid-flow-col gap-4">
            {/* Cost tile */}
            <div className="ring-1 ring-border/60 overflow-hidden rounded-lg">
              <div className="px-3 py-2">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.cost")}
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  {formattedCost}
                </div>
              </div>
            </div>
            <div className="ring-1 ring-border/60 overflow-hidden rounded-lg cursor-default">
              <div className="px-3 py-2">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.totalTokens")}
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  {safeTotal.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="ring-1 ring-border/60 rounded-md">
              <div className="px-3 py-1.5">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.promptTokens")}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {prompt.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="ring-1 ring-border/60 rounded-md">
              <div className="px-3 py-1.5">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.completionTokens")}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {completion.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Usage split OUTSIDE cards */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-muted/60 relative h-2 w-full overflow-hidden rounded-sm ring-1 ring-border/50"
                aria-label="Token usage stacked bar"
              >
                <div
                  className={cn(
                    "h-full bg-primary/70",
                    promptPct === 0 && "hidden"
                  )}
                  style={{ width: `${promptPct}%` }}
                  aria-label="Prompt tokens"
                />
                <div
                  className={cn(
                    "h-full bg-emerald-500/70",
                    completionPct === 0 && "hidden"
                  )}
                  style={{ width: `${completionPct}%` }}
                  aria-label="Completion tokens"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-sm bg-primary/70" />
                  <span className="text-xs">
                    {t("tokensPanel.promptDetail", { count: prompt.toLocaleString(), pct: promptPct })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-sm bg-emerald-500/70" />
                  <span className="text-xs">
                    {t("tokensPanel.completionDetail", { count: completion.toLocaleString(), pct: completionPct })}
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="-mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-sm bg-primary/70" />
              <span>{t("tokensPanel.prompt")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-sm bg-emerald-500/70" />
              <span>{t("tokensPanel.completion")}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {t("tokensPanel.noUsage")}
        </div>
      )}
    </div>
  );
}

export default TokensPanel;
