import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";


export interface LLMTokenUsage {
  /**
   * total input tokens
   */
  input_tokens: number;

  /**
   * total output tokens
   */
  output_tokens: number;

  /**
   * total cached input tokens
   */
  cached_input_tokens: number;

  /**
   * total audio tokens input+output
   */
  audio_tokens: number;

  /**
   * total reasoning tokens
   */
  reasoning_tokens?: number;

  /**
   * llm's context length 
   */
  context_len: number;

  /**
   * total cost
   */
  cost: number;
}

export interface TokensPanelProps extends React.ComponentProps<"div"> {
  model?: string;
  usage: LLMTokenUsage;
  cost: number;
  currency?: string;
  title?: string;
  description?: string;
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
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");

  const totalInputTokens = usage.input_tokens;
  const totalCompletionTokens = usage.output_tokens;
  const totalCachedInputTokens = usage.cached_input_tokens;
  const totalUncachedPrompt = totalInputTokens - totalCachedInputTokens;
  const total = totalInputTokens + totalCompletionTokens;
  const contextLength = usage.context_len;

  const displayCost = isZh ? cost * 7 : cost;
  const displayCurrency = isZh ? "CNY" : currency;

  const uncachedInputTokensPct = total ? Math.round((totalUncachedPrompt / total) * 100) : 0;
  const cacheInputTokensPct = total ? Math.round((totalCachedInputTokens / total) * 100) : 0;
  const completionPct = total ? Math.round((totalCompletionTokens / total) * 100) : 0;
  const cacheHitPct = totalInputTokens ? Math.round((totalCachedInputTokens / totalInputTokens) * 100) : 0;

  const hasUsage = Boolean(total || contextLength);
  const formattedCost = new Intl.NumberFormat(isZh ? "zh-CN" : "en-US", {
    style: "currency",
    currency: displayCurrency,
    maximumFractionDigits: 5,
    maximumSignificantDigits: 10,
  }).format(displayCost);

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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
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
                  {t("tokensPanel.contextLength")}
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  {contextLength.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="ring-1 ring-border/60 rounded-md">
              <div className="px-3 py-1.5">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.promptTokens")}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {totalInputTokens.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="ring-1 ring-border/60 rounded-md">
              <div className="px-3 py-1.5">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.completionTokens")}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {totalCompletionTokens.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="ring-1 ring-border/60 rounded-md">
              <div className="px-3 py-1.5">
                <div className="text-[11px] tracking-wide text-muted-foreground">
                  {t("tokensPanel.cacheHit")}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {`${cacheHitPct}%`}
                </div>
              </div>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-muted/60 relative flex h-2 w-full overflow-hidden rounded-sm ring-1 ring-border/50"
                aria-label="Token usage stacked bar"
              >
                <div
                  className={cn(
                    "h-full bg-primary/70",
                    uncachedInputTokensPct === 0 && "hidden",
                  )}
                  style={{ width: `${uncachedInputTokensPct}%` }}
                  aria-label="Prompt uncached tokens"
                />
                <div
                  className={cn(
                    "h-full bg-sky-500/70",
                    cacheInputTokensPct === 0 && "hidden",
                  )}
                  style={{ width: `${cacheInputTokensPct}%` }}
                  aria-label="Prompt cached tokens"
                />
                <div
                  className={cn(
                    "h-full bg-emerald-500/70",
                    completionPct === 0 && "hidden",
                  )}
                  style={{ width: `${completionPct}%` }}
                  aria-label="Completion tokens"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-sm bg-primary/70" />
                  <span className="text-xs">
                    {t("tokensPanel.uncachedPromptDetail", { count: totalUncachedPrompt, pct: uncachedInputTokensPct })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-sm bg-sky-500/70" />
                  <span className="text-xs">
                    {t("tokensPanel.cachedPromptDetail", { count: totalCachedInputTokens, pct: cacheInputTokensPct })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-sm bg-emerald-500/70" />
                  <span className="text-xs">
                    {t("tokensPanel.completionDetail", { count: totalCompletionTokens, pct: completionPct })}
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="-mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-sm bg-primary/70" />
              <span>{t("tokensPanel.uncachedPrompt")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-sm bg-sky-500/70" />
              <span>{t("tokensPanel.cachedPrompt")}</span>
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
