import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface JSONSchemaParam {
  type?: string;
  description?: string;
  enum?: unknown[];
  [key: string]: unknown;
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchemaParam>;
  required?: string[];
  [key: string]: unknown;
}

interface FunctionDef {
  name?: string;
  description?: string;
  parameters?: JSONSchema;
  [key: string]: unknown;
}

interface ToolEntry {
  type?: string;
  function?: FunctionDef;
  [key: string]: unknown;
}

interface ToolsViewerProps {
  tools: unknown[];
  className?: string;
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function ToolsViewer({ tools, className }: ToolsViewerProps) {
  return (
    <div className={cn("rounded-md border divide-y divide-border", className)}>
      {tools.map((tool, idx) => (
        <ToolRow key={idx} tool={tool as ToolEntry} index={idx} />
      ))}
    </div>
  );
}

/* ── Single tool row ─────────────────────────────────────────────────────── */

function ToolRow({ tool, index }: { tool: ToolEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);

  const fn = tool.function ?? {};
  const name = fn.name ?? `tool_${index}`;
  const description = fn.description;
  const parameters = fn.parameters as JSONSchema | undefined;
  const properties = parameters?.properties ?? {};
  const required = new Set<string>(
    Array.isArray(parameters?.required) ? (parameters!.required as string[]) : []
  );

  const paramEntries = Object.entries(properties);

  return (
    <div>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-black/3 dark:hover:bg-white/4 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

        {/* Index + name */}
        <span className="font-mono text-xs font-semibold shrink-0 text-foreground">
          <span className="text-muted-foreground mr-1">[{index}]</span>
          {name}
        </span>

        {/* Type badge */}
        {tool.type && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono shrink-0">
            {tool.type}
          </Badge>
        )}

        {/* Param count when collapsed */}
        {!expanded && paramEntries.length > 0 && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            {paramEntries.length} param{paramEntries.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Chevron */}
        <span className="ml-auto text-muted-foreground shrink-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-4 pt-1 flex flex-col gap-2.5">
          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed w-full">
              {description}
            </p>
          )}

          {/* Parameter chips */}
          {paramEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {paramEntries.map(([paramName, paramDef]) => {
                const isRequired = required.has(paramName);
                const paramType =
                  typeof paramDef === "object" && paramDef !== null
                    ? (paramDef as JSONSchemaParam).type
                    : undefined;
                return (
                  <ParamChip
                    key={paramName}
                    name={paramName}
                    type={paramType}
                    required={isRequired}
                    description={
                      typeof paramDef === "object" && paramDef !== null
                        ? (paramDef as JSONSchemaParam).description
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Schema toggle */}
          {parameters && (
            <details
              open={schemaOpen}
              onToggle={(e) =>
                setSchemaOpen((e.currentTarget as HTMLDetailsElement).open)
              }
              className="mt-0.5"
            >
              <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors w-fit">
                {schemaOpen ? "Hide schema" : "Show schema"}
              </summary>
              <pre className="mt-1.5 text-xs font-mono whitespace-pre-wrap wrap-anywhere bg-black/10 dark:bg-white/5 rounded p-2">
                {JSON.stringify(parameters, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Parameter chip ──────────────────────────────────────────────────────── */

interface ParamChipProps {
  name: string;
  type?: string;
  required: boolean;
  description?: string;
}

function ParamChip({ name, type, required, description }: ParamChipProps) {
  const [hover, setHover] = useState(false);

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-sm transition-colors",
        required
          ? "border-violet-400/50 bg-violet-50 dark:bg-violet-950/30 text-foreground"
          : "border-border bg-background text-foreground/80"
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Required asterisk */}
      {required && (
        <span className="text-violet-500 dark:text-violet-400 font-bold leading-none">*</span>
      )}
      <span>{name}</span>
      {type && (
        <span className="text-muted-foreground text-[10px]">:{type}</span>
      )}

      {/* Tooltip on hover */}
      {hover && description && (
        <span className="absolute bottom-full left-0 mb-1 z-10 max-w-xs px-2 py-1 rounded bg-popover text-popover-foreground border text-xs font-sans shadow-md whitespace-pre-wrap pointer-events-none">
          {description}
        </span>
      )}
    </span>
  );
}
