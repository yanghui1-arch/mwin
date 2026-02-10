import { memo } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/xyflow-ui/base-node";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowDownToLine, ArrowUpFromLine, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const TraceIONode = memo(({ data }: NodeProps) => {
  const isInput = !!data.input;
  const errorInfo = data.errorInfo as string | undefined;
  const hasError = !isInput && !!errorInfo;
  const { t } = useTranslation();

  const Icon = isInput ? ArrowDownToLine : ArrowUpFromLine;
  const color = isInput ? "border-l-emerald-500" : "border-l-sky-500";
  const bg = isInput
    ? "bg-emerald-500/5 dark:bg-emerald-500/10"
    : "bg-sky-500/5 dark:bg-sky-500/10";
  const label = (data.title as string | undefined) ?? (isInput ? t("traceDialog.input") : t("traceDialog.output"));

  return (
    <BaseNode
      className={`w-[220px] border-l-4 ${color} ${bg} ${hasError ? "ring-1 ring-destructive/50" : ""}`}
    >
      {!isInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="bg-muted-foreground! w-2! h-2! border-2! border-background!"
        />
      )}

      <BaseNodeHeader className="gap-2 py-2.5 px-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <BaseNodeHeaderTitle className="text-xs truncate">
            {label}
          </BaseNodeHeaderTitle>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasError && <AlertCircle className="h-3 w-3 text-destructive" />}
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {isInput ? "IN" : "OUT"}
          </span>
        </div>
      </BaseNodeHeader>

      {isInput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="bg-muted-foreground! w-2! h-2! border-2! border-background!"
        />
      )}
    </BaseNode>
  );
});

TraceIONode.displayName = "TraceIONode";
