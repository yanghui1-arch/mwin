import { cn } from "@/lib/utils";
import type { ReactElement } from "react";

interface LLMJsonHighlightProps {
  jsonObject: Record<string, unknown>;
  className?: string;
}

export function LLMJsonHighlight({ jsonObject, className }: LLMJsonHighlightProps) {
  return (
    <div
      className={cn(
        className,
        "font-mono text-sm whitespace-pre-wrap break-normal [overflow-wrap:anywhere]"
      )}
    >
      {"{"}
      {Object.entries(jsonObject).map(([key, value], idx, arr) => (
        <div key={key} className="ml-4">
          <span className="foreground">"{key}"</span>
          <span className="foreground">: </span>
          {renderValue(value)}
          {idx < arr.length - 1 && <span>,</span>}
        </div>
      ))}
      {"}"}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageBackground(role: unknown): string {
  switch (role) {
    case "user":
      return "bg-json-1";
    case "assistant":
      return "bg-json-2";
    case "tool":
      return "bg-json-3";
    default:
      return "bg-json-4";
  }
}

function renderArrayItem(item: unknown): ReactElement {
  if (!isRecord(item)) {
    return <span>{String(item)}</span>;
  }

  const isLlmMessage =
    "role" in item &&
    ["content", "audio", "tool_calls"].some((key) => key in item);

  if (!isLlmMessage) {
    return <LLMJsonHighlight jsonObject={item} />;
  }

  return (
    <div className={cn("rounded-md", messageBackground(item.role))}>
      <LLMJsonHighlight jsonObject={item} />
    </div>
  );
}

/* Render JSON based on its runtime value type. */
function renderValue(value: unknown): ReactElement {
  if (value === null) {
    return <span className="foreground">null</span>;
  }

  if (Array.isArray(value)) {
    return (
      <span>
        [
        {value.map((item, index) => (
          <div key={index} className="ml-4">
            {renderArrayItem(item)}
            {index < value.length - 1 && (
              <span className="text-gray-400">,</span>
            )}
          </div>
        ))}
        ]
      </span>
    );
  }

  if (isRecord(value)) {
    return <LLMJsonHighlight jsonObject={value} />;
  }

  if (typeof value === "string") {
    return <span>"{value}"</span>;
  }

  return <span>{String(value)}</span>;
}
