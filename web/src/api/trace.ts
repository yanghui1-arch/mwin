import http from "./http"
import type { CompletionUsage } from "openai/resources/completions.mjs"
import type { TracePayload } from "./payload"

type Response<T> = {
    code: number,
    message: string,
    data: T
}

type DeleteTracesParams = {
    deleteIds: string[]
}

export type Track = {
  id: string;
  parent_step_id: string | null
  name: string;
  type: "general" | "llm" | "retrieve" | "tool";
  tags: Array<string>;
  error_info: string | null;
  model: string | null;
  usage: CompletionUsage | null;
  cost: number | null;
  start_time: string;
  end_time: string | null;
};

export const traceApi = {

    getPayload(traceId: string) {
        return http.get<Response<TracePayload>>(
            `/v0/trace/${encodeURIComponent(traceId)}/payload`,
            { timeout: 30000 },
        )
    },

    deleteTraces({ deleteIds }: DeleteTracesParams) {
        return http.post<Response<string[]>>(
            "/v0/trace/delete",
            deleteIds,
        )
    },

    getTracks(traceId: string) {
        return http.post<Response<Track[]>>(
            "/v0/trace/get_tracks",
            { trace_id: traceId }
        )
    }
}
