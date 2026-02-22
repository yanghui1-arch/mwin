import { memo } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/xyflow-ui/base-node";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Brain, Wrench, Search, Settings, AlertCircle, Clock, Repeat, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CNY_RATE = 7;

function formatCost(cost: number, language: string): string {
  const isChinese = language.startsWith("zh");
  const value = isChinese ? cost * CNY_RATE : cost;
  const symbol = isChinese ? "¥" : "$";
  if (value === 0) return `${symbol}0`;
  if (value < 0.0001) return `${symbol}${value.toExponential(2)}`;
  if (value < 0.01) return `${symbol}${value.toFixed(6).replace(/0+$/, "")}`;
  return `${symbol}${value.toFixed(4).replace(/\.?0+$/, "")}`;
}

const typeConfig: Record<
  string,
  { icon: typeof Brain; color: string; bg: string; label: string }
> = {
  llm_response: {
    icon: Brain,
    color: "border-l-blue-500",
    bg: "bg-blue-500/5 dark:bg-blue-500/10",
    label: "LLM",
  },
  tool: {
    icon: Wrench,
    color: "border-l-amber-500",
    bg: "bg-amber-500/5 dark:bg-amber-500/10",
    label: "Tool",
  },
  retrieve: {
    icon: Search,
    color: "border-l-emerald-500",
    bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
    label: "Retrieve",
  },
  customized: {
    icon: Settings,
    color: "border-l-violet-500",
    bg: "bg-violet-500/5 dark:bg-violet-500/10",
    label: "Custom",
  },
};

export const TraceProcessNode = memo(({ data }: NodeProps) => {
  const { i18n } = useTranslation();
  const hasPrev = data.hasPrev as boolean;
  const hasNext = data.hasNext as boolean;
  const trackType = (data.trackType as string) || "customized";
  const hasError = !!(data.errorInfo as string | undefined);
  const durationLabel = data.durationLabel as string | undefined;
  const isRecursive = data.isRecursive as boolean | undefined;
  const hasChildren = data.hasChildren as boolean | undefined;
  const cost = data.cost as number | undefined;

  const config = typeConfig[trackType] || typeConfig.customized;
  const Icon = config.icon;

  return (
    <BaseNode
      className={`w-[220px] border-l-4 ${config.color} ${config.bg} ${hasError ? "ring-1 ring-destructive/50" : ""}`}
    >
      {hasPrev && (
        <Handle
          type="target"
          position={Position.Top}
          className="bg-muted-foreground! w-2! h-2! border-2! border-background!"
        />
      )}

      <BaseNodeHeader className="gap-2 py-2 px-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <BaseNodeHeaderTitle className="text-xs truncate">
            {data.title as string}
          </BaseNodeHeaderTitle>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasError && <AlertCircle className="h-3 w-3 text-destructive" />}
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {config.label}
          </span>
        </div>
      </BaseNodeHeader>

      <div className="flex items-center gap-2 px-3 pb-1.5 text-[10px] text-muted-foreground">
        {durationLabel && (
          <span className="flex items-center gap-0.5 font-mono">
            <Clock className="h-3 w-3" />
            {durationLabel}
          </span>
        )}
        {isRecursive && (
          <span className="flex items-center gap-0.5">
            <Repeat className="h-3 w-3" />
            recursive
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          {cost !== undefined && (
            <span className="font-mono opacity-70">
              {formatCost(cost, i18n.language)}
            </span>
          )}
          {hasChildren && <ChevronRight className="h-3 w-3" />}
        </span>
      </div>

      {hasNext && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="bg-muted-foreground! w-2! h-2! border-2! border-background!"
        />
      )}
    </BaseNode>
  );
});

TraceProcessNode.displayName = "TraceProcessNode";
