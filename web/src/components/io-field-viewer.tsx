import { useState } from "react";
import { Code, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

/* ── Markdown detection ──────────────────────────────────────────────────── */

function isLikelyMarkdown(text: string): boolean {
  return /^#{1,6}\s|\*\*[\s\S]+?\*\*|`{1,3}[\s\S]*?`{1,3}|^\s*[-*+]\s|^\s*>\s|\[.+?\]\(.+?\)/m.test(text);
}

/* ── Shared string viewer (Markdown-aware, with toggle) ──────────────────── */

export function StringViewer({ value, className }: { value: string; className?: string }) {
  const likelyMd = isLikelyMarkdown(value);
  const [markdownMode, setMarkdownMode] = useState(likelyMd);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {likelyMd && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2 text-muted-foreground"
            onClick={() => setMarkdownMode((v) => !v)}
          >
            {markdownMode ? (
              <Code className="h-3 w-3 mr-1" />
            ) : (
              <FileText className="h-3 w-3 mr-1" />
            )}
            {markdownMode ? "Raw" : "MD"}
          </Button>
        </div>
      )}
      {markdownMode && likelyMd ? (
        <Markdown content={value} className="text-sm" />
      ) : (
        <pre className="text-sm font-mono whitespace-pre-wrap wrap-anywhere">{value}</pre>
      )}
    </div>
  );
}

interface IOFieldViewerProps {
  data: Record<string, unknown>;
  className?: string;
}

export function IOFieldViewer({ data, className }: IOFieldViewerProps) {
  const { t } = useTranslation();
  const entries = Object.entries(data);

  const [selectedKey, setSelectedKey] = useState<string | null>(
    entries.length > 0 ? entries[0][0] : null
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-2">
        {t("common.noContent")}
      </p>
    );
  }

  const selectedValue = selectedKey !== null ? data[selectedKey] : undefined;

  return (
    <div className={cn("flex flex-col rounded-md border overflow-hidden", className)}>
      {/* Tab strip */}
      <div
        className="flex gap-1 p-1.5 bg-muted/40 border-b overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {entries.map(([key]) => (
          <button
            key={key}
            onClick={() => setSelectedKey(key)}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all",
              selectedKey === key
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Content area — plain text; Markdown auto-detected for strings */}
      <div className="p-3 bg-background min-h-12">
        {selectedKey !== null && <PlainValue value={selectedValue} />}
      </div>
    </div>
  );
}

interface PlainValueProps {
  value: unknown;
}

function PlainValue({ value }: PlainValueProps) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground font-mono">null</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-sm font-mono">{String(value)}</span>;
  }

  if (typeof value === "string") {
    return <StringViewer value={value} />;
  }

  return (
    <pre className="text-sm font-mono whitespace-pre-wrap wrap-anywhere bg-muted/40 rounded p-2">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
