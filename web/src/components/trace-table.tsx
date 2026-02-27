import type { Trace } from "@/pages/projects/track/trace-columns";
import { DataTable } from "./data-table";
import { RowPanelContent } from "./data-table/data-table-row-panel";
import type { Table } from "@tanstack/react-table";
import { Clock } from "lucide-react";
import TokensPanel from "./tokens-panel";
import type { CompletionUsage } from "openai/resources/completions.mjs";
import { TraceDialogMain } from "./trace-dialog/trace-dialog-main";
import { DataTableToolbar } from "./data-table/data-table-toolbar/common-data-table-toolbar";
import { traceApi, type Track } from "@/api/trace";

interface TraceTableProps {
  table: Table<Trace>
}

export function TraceTable({ table }: TraceTableProps) {

  const getTracks = async (traceId: string): Promise<Track[]> => {
    const response = await traceApi.getTracks(traceId);
    if (response.data.code === 200) {
      return response.data.data;
    }
    return [];
  }
  
  const onDelete = async (deleteIds: string[]): Promise<number> => {
    const count = (await traceApi.deleteTraces({ deleteIds})).data.data.length;
    return count
  }

  return (
    <div className="container mx-auto py-2 space-y-4">
      <DataTableToolbar table={table} onDelete={onDelete}/>
      <DataTable table={table}>
        <RowPanelContent<Trace>>
          {async (rowData) => {
            /* generate a new grouping result based model name and don't udpate rowData.tracks */
            const tracks = await getTracks(rowData.id);
            const groupedUsage = tracks.reduce(
              (acc, track) => {
                const model: string | undefined = track.model;
                const usage: CompletionUsage | undefined = track.usage;
                if (!usage || !model) return acc;

                const prev = acc.get(model);
                if (prev) {
                  /* create a copy */
                  const newUsage = { ...prev };
                  newUsage.cost = (newUsage.cost ?? 0) + (track.cost ?? 0);

                  /* merge token usage */
                  const addUsage = (preToken?: number, curToken?: number): number | undefined => {
                    return preToken === undefined || curToken === undefined ? undefined : preToken + curToken
                  }
                  const mergeCompletionTokensDetails = (
                    preCompletionTokensDetails?: CompletionUsage.CompletionTokensDetails, 
                    curCompletionTokensDetails?: CompletionUsage.CompletionTokensDetails
                  ): CompletionUsage.CompletionTokensDetails | undefined => {

                    return preCompletionTokensDetails === undefined || curCompletionTokensDetails == undefined ? undefined : (
                      {
                        accepted_prediction_tokens: addUsage(preCompletionTokensDetails.accepted_prediction_tokens, curCompletionTokensDetails.accepted_prediction_tokens),
                        audio_tokens: addUsage(preCompletionTokensDetails.audio_tokens, curCompletionTokensDetails.audio_tokens),
                        reasoning_tokens: addUsage(preCompletionTokensDetails.reasoning_tokens, curCompletionTokensDetails.reasoning_tokens),
                        rejected_prediction_tokens: addUsage(preCompletionTokensDetails.rejected_prediction_tokens, curCompletionTokensDetails.rejected_prediction_tokens),
                      }
                    )
                  }
                  const mergePromptTokensDetails = (
                    prePromptTokensDetails?: CompletionUsage.PromptTokensDetails,
                    curPromptTokensDetails?: CompletionUsage.PromptTokensDetails,
                  ): CompletionUsage.PromptTokensDetails | undefined => {
                    return !prePromptTokensDetails || !curPromptTokensDetails ? undefined : (
                      {
                        audio_tokens: addUsage(prePromptTokensDetails.audio_tokens, curPromptTokensDetails.audio_tokens),
                        cached_tokens: addUsage(prePromptTokensDetails.cached_tokens, curPromptTokensDetails.cached_tokens),
                      }
                    )
                  }

                  newUsage.completion_tokens += usage.completion_tokens;
                  newUsage.prompt_tokens += usage.prompt_tokens;
                  newUsage.total_tokens += usage.total_tokens;
                  newUsage.completion_tokens_details = mergeCompletionTokensDetails(newUsage.completion_tokens_details, usage.completion_tokens_details);
                  newUsage.prompt_tokens_details = mergePromptTokensDetails(newUsage.prompt_tokens_details, usage.prompt_tokens_details);
                  
                  acc.set(model, newUsage);
                } else {
                  acc.set(model, { ...usage, cost: track.cost ?? 0 });
                }

                return acc;
              },
              new Map<string, CompletionUsage & { cost: number }>()
            );

            return (
              <div className="flex gap-4 flex-col break-all">
                <div className="ml-auto font-mono text-xs flex gap-1">
                  <Clock size={"16px"} />
                  {(() => {
                    const delta =
                      new Date(rowData.lastUpdateTimestamp).getTime() -
                      new Date(rowData.startTime).getTime();
                    return delta < 1000 ? `${delta}ms` : `${(delta / 1000).toFixed(2)}s`;
                  })()}
                </div>
                {Array.from(groupedUsage.entries()).map(([model, completionUsage]) => (
                  <TokensPanel
                    key={model}
                    model={model}
                    usage={completionUsage}
                    cost={completionUsage.cost}
                  />
                ))}
                <TraceDialogMain data={rowData} tracks={tracks}/>
              </div>
            );
          }}
        </RowPanelContent>
      </DataTable>
    </div>
  );
}
