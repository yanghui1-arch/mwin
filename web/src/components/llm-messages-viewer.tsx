import { useState } from "react";
import { ChevronDown, ChevronRight, Code, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";

export interface LLMMessage {
  role: string;
  content?: string | unknown;
  [key: string]: unknown;
}

interface LLMMessagesViewerProps {
  messages: LLMMessage[];
  className?: string;
}

export function LLMMessagesViewer({ messages, className }: LLMMessagesViewerProps) {
  // First message expanded by default; supports multi-expand for comparison
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set([0]));

  const toggle = (idx: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "rounded-md border divide-y divide-border",
        className
      )}
    >
      {messages.map((msg, idx) => (
        <MessageRow
          key={idx}
          message={msg}
          index={idx}
          isExpanded={expandedSet.has(idx)}
          onToggle={() => toggle(idx)}
        />
      ))}
    </div>
  );
}

/* ── Role colour helpers ─────────────────────────────────────────────────── */

function getRoleExpandedBg(role: string): string {
  switch (role) {
    case "user":      return "bg-json-1";
    case "assistant": return "bg-json-2";
    case "tool":      return "bg-json-3";
    default:          return "bg-json-4";
  }
}

function getRoleDot(role: string): string {
  switch (role) {
    case "user":      return "bg-blue-400 dark:bg-blue-500";
    case "assistant": return "bg-emerald-400 dark:bg-emerald-500";
    case "tool":      return "bg-amber-400 dark:bg-amber-500";
    default:          return "bg-slate-400 dark:bg-slate-500";
  }
}

/* ── Single message row ──────────────────────────────────────────────────── */

interface MessageRowProps {
  message: LLMMessage;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function MessageRow({ message, index, isExpanded, onToggle }: MessageRowProps) {
  const [markdownMode, setMarkdownMode] = useState(true);
  const { role, content, ...rest } = message;

  const hasStringContent = typeof content === "string";
  const contentStr = hasStringContent
    ? (content as string)
    : JSON.stringify(content, null, 2);

  const preview =
    typeof content === "string"
      ? content.trim().replace(/\s+/g, " ").slice(0, 90)
      : typeof content === "object" && content !== null
        ? JSON.stringify(content).slice(0, 90)
        : "";

  const previewTrimmed = preview.length >= 90 ? preview + "…" : preview;

  return (
    <div className={cn(isExpanded && getRoleExpandedBg(role))}>
      {/* ── Collapsed / header row ── */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-black/3 dark:hover:bg-white/4 transition-colors"
        onClick={onToggle}
      >
        {/* Role dot */}
        <span
          className={cn("w-2 h-2 rounded-full shrink-0", getRoleDot(role))}
        />

        {/* Index + role */}
        <span className="font-mono text-xs font-semibold w-24 shrink-0 text-foreground">
          <span className="text-muted-foreground mr-1">[{index}]</span>
          {role}
        </span>

        {/* Preview when collapsed */}
        {!isExpanded && previewTrimmed && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            {previewTrimmed}
          </span>
        )}

        {/* Chevron */}
        <span className="ml-auto text-muted-foreground shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <div className="flex flex-col">
          {/* MD / Raw toggle */}
          {hasStringContent && (
            <div className="flex justify-end px-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setMarkdownMode(!markdownMode);
                }}
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

          {/* Content — capped height so long responses don't explode the layout */}
          {content !== undefined && content !== null && (
            <div className="overflow-y-auto max-h-[45vh] px-4 pb-4 pt-1">
              {markdownMode && hasStringContent ? (
                <Markdown content={contentStr} className="text-sm" />
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap wrap-anywhere bg-black/10 dark:bg-white/5 rounded p-2.5">
                  {contentStr}
                </pre>
              )}
            </div>
          )}

          {/* Extra fields (tool_call_id, name, tool_calls, …) */}
          {Object.keys(rest).length > 0 && (
            <details className="px-4 pb-3">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                Other fields ({Object.keys(rest).join(", ")})
              </summary>
              <pre className="mt-1.5 text-xs font-mono whitespace-pre-wrap wrap-anywhere bg-black/10 dark:bg-white/5 rounded p-2">
                {JSON.stringify(rest, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
