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
import { Badge } from "./ui/badge";
import { useState } from "react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import type { CompletionUsage } from "openai/resources/completions.mjs";

interface StepTableProps {
  table: Table<Step>;
}

enum Display {
  FunctionInput,
  FunctionOutput,
  LLMInput,
  LLMOutput,
}

// convert CompletionUsgae to LLMTokenUsage
const toLLMTokenUsage = (usage: CompletionUsage | undefined, cost: number | undefined): LLMTokenUsage => {
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

export function StepTable({ table }: StepTableProps) {
  const [displayPanel, setDisplayPanel] = useState<Display>(
    Display.FunctionInput
  );
  const { t } = useTranslation();

  const onDelete = async (deleteIds: string[]): Promise<number> => {
    const count = (await stepApi.deleteSteps({ deleteIds })).data.data.length;
    return count;
  };

  return (
    <div className="container mx-auto py-2 space-y-4">
      <DataTableToolbar table={table} onDelete={onDelete} />
      <DataTable table={table}>
        <RowPanelContent<Step>>
          {(rowData) => {
            const tagColors = [
              "tag-blue",
              "tag-emerald",
              "tag-amber",
              "tag-violet",
              "tag-rose",
              "tag-cyan",
              "tag-orange",
              "tag-teal",
            ];
            const tags = rowData.tags.map((tag, i) => (
              <Badge className={tagColors[i % tagColors.length]} variant="outline">
                {tag}
              </Badge>
            ));
            return (
              <div className="flex gap-4 flex-col break-all">
                <div className="flex">
                  <div className="mr-auto flex gap-2 font-mono">{tags}</div>
                  <div className="ml-auto font-mono text-xs flex gap-1">
                    <Clock size={"16px"} />
                    {new Date(rowData.endTime).getTime() -
                      new Date(rowData.startTime).getTime() <
                    1000
                      ? new Date(rowData.endTime).getTime() -
                        new Date(rowData.startTime).getTime() +
                        "ms"
                      : (
                          (new Date(rowData.endTime).getTime() -
                            new Date(rowData.startTime).getTime()) /
                          1000
                        ).toFixed(2) + "s"}
                  </div>
                </div>

                <TokensPanel
                  key={rowData.model}
                  model={rowData.model}
                  usage={toLLMTokenUsage(rowData.usage, rowData.cost)}
                  cost={rowData.cost ?? 0}
                />

                <div className="flex gap-2">
                  <Button
                    variant="link"
                    onClick={() => setDisplayPanel(Display.FunctionInput)}
                    className={
                      displayPanel === Display.FunctionInput
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {t("stepTable.functionInput")}
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => setDisplayPanel(Display.FunctionOutput)}
                    className={
                      displayPanel === Display.FunctionOutput
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {t("stepTable.functionOutput")}
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => setDisplayPanel(Display.LLMInput)}
                    className={
                      displayPanel === Display.LLMInput
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {t("stepTable.llmInput")}
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => setDisplayPanel(Display.LLMOutput)}
                    className={
                      displayPanel === Display.LLMOutput
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {t("stepTable.llmOutput")}
                  </Button>
                </div>

                {displayPanel === Display.FunctionInput && (
                  <FunctionIOCard data={rowData.input.func_inputs} />
                )}

                {displayPanel === Display.FunctionOutput && (
                  <FunctionIOCard
                    data={rowData.output.func_output}
                    errorInfo={rowData.errorInfo}
                  />
                )}

                {displayPanel === Display.LLMInput && (
                  rowData.input.llm_inputs ? (
                    <LLMJsonCard
                      jsonObject={rowData.input.llm_inputs as Record<string, unknown>}
                    />
                  ) : (
                    <LLMJsonCard errorInfo={t("stepTable.noLLMParams")} />
                  )
                )}

                {displayPanel === Display.LLMOutput && (
                  <LLMJsonCard
                    jsonObject={rowData.output.llm_outputs}
                    errorInfo={rowData.errorInfo}
                  />
                )}
              </div>
            );
          }}
        </RowPanelContent>
      </DataTable>
    </div>
  );
}
