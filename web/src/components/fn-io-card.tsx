import { IOFieldViewer, StringViewer } from "./io-field-viewer";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface FunctionIOCardProps {
  labelTitle?: string;
  data?: string | Record<string, unknown>;
  errorInfo?: string;
  className?: string;
}

/**
 * Tracked function input or output card.
 *
 * - Object data → IOFieldViewer tab strip (plain text, no Markdown).
 * - String data → plain text pre block (no Markdown).
 * - No data     → shows errorInfo or "no content".
 */
export function FunctionIOCard({
  labelTitle,
  data,
  errorInfo,
  className,
}: FunctionIOCardProps) {
  const { t } = useTranslation();

  if (data === undefined || data === null) {
    return (
      <div className={cn("flex flex-col flex-1 gap-2", className)}>
        {labelTitle && <Label>{labelTitle}</Label>}
        <p className="text-sm text-muted-foreground">{errorInfo ?? t("common.noContent")}</p>
      </div>
    );
  }

  if (typeof data === "object") {
    return (
      <div className={cn("flex flex-col flex-1 gap-2", className)}>
        {labelTitle && <Label>{labelTitle}</Label>}
        <div className="overflow-y-auto max-h-[60vh]">
          <IOFieldViewer data={data} />
        </div>
      </div>
    );
  }

  // String — Markdown auto-detected with toggle, else plain text.
  return (
    <div className={cn("flex flex-col flex-1 gap-2", className)}>
      {labelTitle && <Label>{labelTitle}</Label>}
      <div className="overflow-y-auto max-h-[60vh] rounded-md border bg-card p-3">
        <StringViewer value={data} />
      </div>
    </div>
  );
}
