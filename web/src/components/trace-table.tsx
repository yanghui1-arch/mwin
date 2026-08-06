import type { Trace } from "@/pages/projects/track/trace-columns";
import { DataTable } from "./data-table";
import { RowPanelContent } from "./data-table/data-table-row-panel";
import type { Table } from "@tanstack/react-table";
import { Clock } from "lucide-react";
import TokensPanel, { type LLMTokenUsage } from "./tokens-panel";
import type { CompletionUsage } from "openai/resources/completions.mjs";
import { TraceDialogMain } from "./trace-dialog/trace-dialog-main";
import { DataTableToolbar } from "./data-table/data-table-toolbar/common-data-table-toolbar";
import { traceApi, type Track } from "@/api/trace";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";

interface TraceTableProps {
  table: Table<Trace>;
  isLoading?: boolean;
}


// convert CompletionUsgae to LLMTokenUsage
const toLLMTokenUsage = (usage: CompletionUsage, cost: number): LLMTokenUsage => {
  const inputTokens = usage.prompt_tokens;
  const cachedInputTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const outputTokens = usage.completion_tokens;
  const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens;
  const audioTokens = usage.prompt_tokens_details?.audio_tokens ?? 0 + (usage.completion_tokens_details?.audio_tokens ?? 0);

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_input_tokens: cachedInputTokens,
    audio_tokens: audioTokens,
    reasoning_tokens: reasoningTokens,
    context_len: inputTokens + outputTokens,
    cost: cost,
  };
};

export function TraceTable({ table, isLoading = false }: TraceTableProps) {
  const onDelete = async (deleteIds: string[]): Promise<number> => {
    const count = (await traceApi.deleteTraces({ deleteIds })).data.data.length;
    return count;
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 py-2">
      <DataTableToolbar table={table} onDelete={onDelete} />
      <DataTable table={table} isLoading={isLoading}>
        <RowPanelContent<Trace>>
          {(rowData) => <TraceDetails rowData={rowData} />}
        </RowPanelContent>
      </DataTable>
    </div>
  );
}

function TraceDetails({ rowData }: { rowData: Trace }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    traceApi.getTracks(rowData.id)
      .then((response) => {
        if (active) {
          setTracks(response.data.code === 200 ? response.data.data : []);
        }
      })
      .catch((error) => {
        console.error("Failed to load trace tracks:", error);
        if (active) setTracks([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rowData.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="ml-auto h-4 w-20" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-36" />
      </div>
    );
  }

  const groupedUsage = tracks.reduce(
    (acc, track) => {
      const model = track.model;
      const usage = track.usage;
      if (!usage || !model) return acc;

      const current = toLLMTokenUsage(usage, track.cost ?? 0);
      const prev = acc.get(model);
      if (!prev) {
        acc.set(model, current);
        return acc;
      }

      current.input_tokens += prev.input_tokens;
      current.output_tokens += prev.output_tokens;
      current.cached_input_tokens += prev.cached_input_tokens;
      current.audio_tokens += prev.audio_tokens;
      current.reasoning_tokens = (prev.reasoning_tokens ?? 0) + (current.reasoning_tokens ?? 0);
      current.cost += prev.cost;
      acc.set(model, current);
      return acc;
    },
    new Map<string, LLMTokenUsage>(),
  );

  const delta =
    new Date(rowData.lastUpdateTimestamp).getTime() -
    new Date(rowData.startTime).getTime();

  return (
    <div className="flex flex-col gap-4 break-all">
      <div className="ml-auto flex gap-1 font-mono text-xs">
        <Clock />
        {delta < 1000 ? `${delta}ms` : `${(delta / 1000).toFixed(2)}s`}
      </div>
      {Array.from(groupedUsage.entries()).map(([model, usage]) => (
        <TokensPanel key={model} model={model} usage={usage} cost={usage.cost} />
      ))}
      <TraceDialogMain data={rowData} tracks={tracks} />
    </div>
  );
}
