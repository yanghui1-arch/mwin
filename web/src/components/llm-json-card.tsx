import { useState } from "react";
import { Code, FileText } from "lucide-react";
import { IOFieldViewer } from "./io-field-viewer";
import { LLMMessagesViewer, type LLMMessage } from "./llm-messages-viewer";
import { ToolsViewer } from "./tools-viewer";
import { Markdown } from "./markdown";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { useTranslation } from "react-i18next";

interface StepDetailProp {
  labelTitle?: string;
  jsonObject?: Record<string, unknown>;
  errorInfo?: string;
  /**
   * When true (default), LLM-aware rendering:
   *   - `messages` array (llm_inputs)  → LLMMessagesViewer, Markdown per message
   *   - `choices`  array (llm_outputs) → extract each choice.message → LLMMessagesViewer
   *   - `content`  string (optional top-level) → ContentViewer with Markdown toggle
   *   - everything else → IOFieldViewer (plain text tab strip)
   * When false, all fields go through IOFieldViewer (plain text).
   */
  llmJsonLight?: boolean;
}

export function LLMJsonCard({
  labelTitle,
  jsonObject,
  errorInfo,
  llmJsonLight = true,
}: StepDetailProp) {
  const { t } = useTranslation();

  if (!jsonObject) {
    return (
      <div className="flex flex-col gap-2 flex-1">
        {labelTitle && <Label>{labelTitle}</Label>}
        <p className="text-sm text-muted-foreground">
          {errorInfo ?? t("common.noContent")}
        </p>
      </div>
    );
  }

  if (llmJsonLight) {
    // Extract the four "special" keys; everything else goes to the tab strip.
    const { messages, content, choices, tools, ...rest } = jsonObject;

    // LLM input: messages array
    const inputMessages = Array.isArray(messages) && messages.length > 0
      ? (messages as LLMMessage[])
      : null;

    // LLM input: tools array
    const inputTools = Array.isArray(tools) && tools.length > 0
      ? (tools as unknown[])
      : null;

    // LLM output: extract message from each choice
    const responseMessages =
      Array.isArray(choices) && choices.length > 0
        ? (choices as Array<Record<string, unknown>>)
            .map((c) => c.message)
            .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
            .map((m) => m as LLMMessage)
        : null;

    // Optional top-level content (flattened by some backends)
    const topContent = typeof content === "string" && content.length > 0
      ? content
      : null;

    return (
      <div className="flex flex-col gap-2 flex-1">
        {labelTitle && <Label>{labelTitle}</Label>}
        <div className="overflow-y-auto max-h-[60vh] space-y-3">

          {/* Metadata / other fields — plain text tab strip */}
          {Object.keys(rest).length > 0 && <IOFieldViewer data={rest} />}

          {/* LLM output: response messages from choices */}
          {responseMessages && (
            <SectionBlock label="response">
              <LLMMessagesViewer messages={responseMessages} />
            </SectionBlock>
          )}

          {/* LLM output: top-level content (if backend flattens it) */}
          {topContent && !responseMessages && (
            <ContentViewer content={topContent} />
          )}

          {/* LLM input: tools */}
          {inputTools && (
            <SectionBlock label="tools">
              <ToolsViewer tools={inputTools} />
            </SectionBlock>
          )}

          {/* LLM input: messages */}
          {inputMessages && (
            <SectionBlock label="messages">
              <LLMMessagesViewer messages={inputMessages} />
            </SectionBlock>
          )}

        </div>
      </div>
    );
  }

  // Non-LLM mode — plain text only.
  return (
    <div className="flex flex-col gap-2 flex-1">
      {labelTitle && <Label>{labelTitle}</Label>}
      <div className="overflow-y-auto max-h-[60vh]">
        <IOFieldViewer data={jsonObject} />
      </div>
    </div>
  );
}

/* ── Shared section label wrapper ────────────────────────────────────────── */

function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono font-medium text-muted-foreground mb-1.5 px-0.5">
        {label}
      </p>
      {children}
    </div>
  );
}

/* ── LLM output top-level content viewer (Markdown + Raw toggle) ─────────── */

function ContentViewer({ content }: { content: string }) {
  const [markdownMode, setMarkdownMode] = useState(true);

  return (
    <div className="flex flex-col rounded-md border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b">
        <span className="text-xs font-mono font-medium text-muted-foreground">
          content
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 text-muted-foreground"
          onClick={() => setMarkdownMode(!markdownMode)}
        >
          {markdownMode ? (
            <Code className="h-3 w-3 mr-1" />
          ) : (
            <FileText className="h-3 w-3 mr-1" />
          )}
          {markdownMode ? "Raw" : "MD"}
        </Button>
      </div>
      <div className="p-3 bg-background">
        {markdownMode ? (
          <Markdown content={content} className="text-sm" />
        ) : (
          <pre className="text-sm font-mono whitespace-pre-wrap wrap-anywhere">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
