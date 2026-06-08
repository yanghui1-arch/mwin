import type { Trace } from "@/pages/projects/track/trace-columns"
import type { InputData, OutputData } from "@/pages/projects/track/step-columns"
import http from "./http"
import type { CompletionUsage } from "openai/resources/completions.mjs"

export type ApiResponse<T> = {
    code: number,
    message: string,
    data: T
}

type Response<T> = ApiResponse<T>

type DeleteTracesParams = {
    deleteIds: string[]
}

export type Track = {
  id: string;
  parent_step_id: string
  name: string;
  type: "customized" | "llm_response" | "retrieve" | "tool";
  input: InputData;
  output: OutputData;
  tags: Array<string>;
  error_info?: string;
  model?: string;
  usage?: CompletionUsage;
  cost?: number;
  start_time: string;
  end_time: string;
};

export const traceApi = {

    deleteTraces({ deleteIds }: DeleteTracesParams) {
        return http.post<Response<string[]>>(
            "/v0/trace/delete",
            deleteIds,
        )
    },

    getConversationTraceTimeline(projectId: string, conversationId: string) {
        return http.get<Response<Trace[]>>(
            `/v0/trace/project/${encodeURIComponent(projectId)}/conversation/${encodeURIComponent(conversationId)}`,
        )
    },

    getTracks(traceId: string) {
        return http.post<Response<Track[]>>(
            "/v0/trace/get_tracks",
            { trace_id: traceId }
        )
    }
}