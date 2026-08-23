import type { ChatCompletionAudio, ChatCompletionMessageToolCall } from "openai/resources/index.mjs";
import type { Annotation } from "openai/resources/beta/threads/messages.mjs";
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat/completions/completions";
import type { CompletionUsage } from "openai/resources/index.mjs";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface FilteredFieldsOpenAIChatCompletionsOutput extends Record<string, unknown> {
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

export interface InputData {
  func_inputs?: Record<string, unknown>;
  llm_inputs?: ChatCompletionCreateParams;
}

export interface OutputData {
  func_output?: JsonValue;
  llm_outputs?: FilteredFieldsOpenAIChatCompletionsOutput | JsonValue;
}

export interface StepPayload {
  input: InputData | null;
  output: OutputData | null;
}

export interface TracePayload {
  input: Record<string, unknown> | null;
  output: OutputData | null;
}
