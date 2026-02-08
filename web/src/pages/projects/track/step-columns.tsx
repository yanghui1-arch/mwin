import { type ChatCompletionAudio } from "openai/resources/index.mjs";
import { type Annotation } from "openai/resources/beta/threads/messages.mjs";
import { type ChatCompletionMessageToolCall } from "openai/resources/index.mjs";
import { type ChatCompletion } from "openai/resources/chat/completions/completions";
import { type CompletionUsage } from "openai/resources/index.mjs";
import { type ResponseCreateParams } from "openai/resources/responses/responses.mjs";
import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import i18n from "@/i18n";

/* style as the same as openai */
export interface FilteredFieldsOpenAIChatCompletionsOutput extends Record<string, unknown>{
  model: string;
  created: string;
  content?: string;
  role?: "assistant";
  annotations?: Array<Annotation>;
  audio?: ChatCompletionAudio;
  tool_calls?: Array<ChatCompletionMessageToolCall>;
  choices: Array<ChatCompletion.Choice>;
  service_tier?: "auto" | "default" | "flex" | "scale" | "priority";
  system_fingerprint?: string;
  usage?: CompletionUsage;
}

/* style as the same as python to sql storage */
export interface InputData {
  func_inputs: Record<string, unknown>;
  llm_inputs?: ResponseCreateParams;
}

/* style as the same as python to sql storage */
export interface OutputData {
  func_output?: Record<string, unknown> | string;
  llm_outputs?: FilteredFieldsOpenAIChatCompletionsOutput;
}

export type Step = {
  id: string;
  parentStepId: string
  name: string;
  type: "customized" | "llm_response" | "retrieve" | "tool";
  input: InputData;
  output: OutputData;
  tags: Array<string>;
  errorInfo?: string;
  model?: string;
  usage?: CompletionUsage;
  startTime: string;
  endTime: string;
};

export const stepColumns: ColumnDef<Step>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <span className="w-4 inline-flex justify-end">
              <List className="h-4 w-4" />
            </span>
            <span className="font-semibold">ID</span>
            <span className="w-4 inline-flex justify-start">
              {column.getIsSorted() === "asc" ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </span>
          </span>
        </Button>
      );
    },
    cell: ({row}) => {

      return (
        <div className="w-40 truncate justify-center">
          {row.original.id}
        </div>
      )
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <span className="w-4 inline-flex justify-end">
              <List className="h-4 w-4" />
            </span>
            <span className="font-semibold">{i18n.t("track.columns.name")}</span>
            <span className="w-4 inline-flex justify-start">
              {column.getIsSorted() === "asc" ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </span>
          </span>
        </Button>
      );
    },
  },
  {
    accessorKey: "fn_input",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.functionInput")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const functionInput = row.original.input.func_inputs;

      return (
        <div className="flex gap-2 justify-center">
          <ScrollArea className="h-20 w-58 rounded-md p-4 ">
            <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words text-left">
              <code>{JSON.stringify(functionInput, null, 2)}</code>
            </pre>
          </ScrollArea>
        </div>
      );
    },
  },
  {
    accessorKey: "fn_output",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.functionOutput")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const functionOutput = row.original.output.func_output;

      return (
        <div className="flex gap-2 justify-center">
          <ScrollArea className="h-20 w-58 rounded-md p-4 ">
            <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words text-left">
              <code>{JSON.stringify(functionOutput, null, 2)}</code>
            </pre>
          </ScrollArea>
        </div>
      );
    },
  },
  {
    accessorKey: "startTime",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.startTime")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const startTime = row.original.startTime;
      return <div className="text-center font-medium">{startTime}</div>;
    },
  },
  {
    accessorKey: "endTime",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.endTime")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const endTime = row.original.endTime;
      return <div className="text-center font-medium">{endTime}</div>;
    },
  },
];
