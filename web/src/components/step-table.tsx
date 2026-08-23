import { type Table } from "@tanstack/react-table";
import { type Step } from "@/pages/projects/track/step-columns";
import { DataTable } from "./data-table";
import { RowPanelContent } from "./data-table/data-table-row-panel";
import { Clock } from "lucide-react";
import TokensPanel, { type LLMTokenUsage } from "./tokens-panel";
import { LLMJsonCard } from "./llm-json-card";
import { FunctionIOCard } from "./fn-io-card";
import { DataTableToolbar } from "./data-table/data-table-toolbar/common-data-table-toolbar";
import { stepApi } from "@/api/step";
import type { StepPayload } from "@/api/payload";
import { Badge } from "./ui/badge";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import type { CompletionUsage } from "openai/resources/completions.mjs";
import { Skeleton } from "./ui/skeleton";

interface StepTableProps {
  table: Table<Step>;
  isLoading?: boolean;
}

enum Display {
  FunctionInput,
  FunctionOutput,
  LLMInput,
  LLMOutput,
}

// convert CompletionUsgae to LLMTokenUsage
const toLLMTokenUsage = (
  usage: CompletionUsage | null | undefined,
  cost: number | null | undefined,
): LLMTokenUsage => {
  if (!usage) {
    return {
      input_tokens: 0,
      output_tokens: 0,
      cached_input_tokens: 0,
      audio_tokens: 0,
      reasoning_tokens: 0,
      context_len: 0,
      cost: cost ?? 0,
    }
  }
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
    cost: cost ?? 0,
  };
};

export function StepTable({ table, isLoading = false }: StepTableProps) {
  const onDelete = async (deleteIds: string[]): Promise<number> => {
    const count = (await stepApi.deleteSteps({ deleteIds })).data.data.length;
    return count;
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 py-2">
      <DataTableToolbar table={table} onDelete={onDelete} />
      <DataTable table={table} isLoading={isLoading}>
        <RowPanelContent<Step>>
          {(rowData) => <StepDetails rowData={rowData} />}
        </RowPanelContent>
      </DataTable>
    </div>
  );
}

function StepDetails({ rowData }: { rowData: Step }) {
  const [displayPanel, setDisplayPanel] = useState<Display>(Display.FunctionInput);
  const [payload, setPayload] = useState<StepPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setPayload(null);
    setError(null);
    stepApi.getPayload(rowData.id)
      .then((response) => {
        if (active) setPayload(response.data.data);
      })
      .catch((reason: Error) => {
        if (active) {
          setPayload(null);
          setError(reason.message);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [rowData.id]);

  const tagColors = ["tag-blue", "tag-emerald", "tag-amber", "tag-violet", "tag-rose", "tag-cyan", "tag-orange", "tag-teal"];
  const endTime = rowData.endTime ? new Date(rowData.endTime).getTime() : null;
  const startTime = new Date(rowData.startTime).getTime();
  const duration = endTime === null ? null : endTime - startTime;

  return (
    <div className="flex flex-col gap-4 break-all">
      <div className="flex">
        <div className="mr-auto flex gap-2 font-mono">
          {rowData.tags.map((tag, index) => (
            <Badge key={tag} className={tagColors[index % tagColors.length]} variant="outline">{tag}</Badge>
          ))}
        </div>
        {duration !== null && (
          <div className="ml-auto flex gap-1 font-mono text-xs">
            <Clock size="16px" />
            {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
          </div>
        )}
      </div>

      <TokensPanel
        key={rowData.model}
        model={rowData.model}
        usage={toLLMTokenUsage(rowData.usage, rowData.cost)}
        cost={rowData.cost ?? 0}
      />

      <div className="flex gap-2">
        <Button variant="link" onClick={() => setDisplayPanel(Display.FunctionInput)} className={displayPanel === Display.FunctionInput ? "bg-primary text-primary-foreground" : ""}>{t("stepTable.functionInput")}</Button>
        <Button variant="link" onClick={() => setDisplayPanel(Display.FunctionOutput)} className={displayPanel === Display.FunctionOutput ? "bg-primary text-primary-foreground" : ""}>{t("stepTable.functionOutput")}</Button>
        <Button variant="link" onClick={() => setDisplayPanel(Display.LLMInput)} className={displayPanel === Display.LLMInput ? "bg-primary text-primary-foreground" : ""}>{t("stepTable.llmInput")}</Button>
        <Button variant="link" onClick={() => setDisplayPanel(Display.LLMOutput)} className={displayPanel === Display.LLMOutput ? "bg-primary text-primary-foreground" : ""}>{t("stepTable.llmOutput")}</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-36 w-full" />
      ) : error ? (
        <LLMJsonCard errorInfo={error} />
      ) : displayPanel === Display.FunctionInput ? (
        <FunctionIOCard data={payload?.input?.func_inputs} />
      ) : displayPanel === Display.FunctionOutput ? (
        <FunctionIOCard data={payload?.output?.func_output} errorInfo={rowData.errorInfo} />
      ) : displayPanel === Display.LLMInput ? (
        payload?.input?.llm_inputs ? <LLMJsonCard jsonObject={payload.input.llm_inputs as unknown as Record<string, unknown>} /> : <LLMJsonCard errorInfo={t("stepTable.noLLMParams")} />
      ) : (
        <LLMJsonCard jsonObject={payload?.output?.llm_outputs} errorInfo={rowData.errorInfo} />
      )}
    </div>
  );
}
