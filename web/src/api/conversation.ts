import http from "./http"

type Response<T> = { code: number; message: string; data: T }

export type PageVO<T> = { pageCount: number; data: T[] }
export type AsyncDataState<T> =
  | { status: "idle"; loading: false; error: null; empty: false; data: null }
  | { status: "loading"; loading: true; error: null; empty: false; data: null }
  | { status: "error"; loading: false; error: Error; empty: false; data: null }
  | { status: "empty"; loading: false; error: null; empty: true; data: T }
  | { status: "success"; loading: false; error: null; empty: false; data: T }

type JsonObject = Record<string, unknown>

export type ConversationSummary = {
  conversationId: string
  projectName: string
  name: string
  traceCount: number
  tags: string[]
  input?: JsonObject
  output?: JsonObject
  errorInfo?: string
  startTime: string
  lastUpdateTimestamp: string
}

export type ConversationTraceTimelineItem = {
  traceId: string
  name: string
  tags: string[]
  input?: JsonObject
  output?: JsonObject
  errorInfo?: string
  startTime: string
  lastUpdateTimestamp: string
}

export type ConversationSummaryPageParams = { projectName: string; page: number; pageSize: number }
export type ConversationTraceTimelineParams = { conversationId: string }

const emptyState = <T>(data: T): AsyncDataState<T> => ({ status: "empty", loading: false, error: null, empty: true, data })
const successState = <T>(data: T): AsyncDataState<T> => ({ status: "success", loading: false, error: null, empty: false, data })
const errorState = <T>(error: unknown): AsyncDataState<T> => ({
  status: "error",
  loading: false,
  error: error instanceof Error ? error : new Error(String(error)),
  empty: false,
  data: null,
})

export const conversationState = {
  idle: <T>(): AsyncDataState<T> => ({ status: "idle", loading: false, error: null, empty: false, data: null }),
  loading: <T>(): AsyncDataState<T> => ({ status: "loading", loading: true, error: null, empty: false, data: null }),
}

export const conversationApi = {
  async getSummaryPage(params: ConversationSummaryPageParams): Promise<PageVO<ConversationSummary>> {
    const res = await http.get<Response<PageVO<ConversationSummary>>>(
      `/v0/conversation/${encodeURIComponent(params.projectName)}`,
      { params: { page: params.page, pageSize: params.pageSize } },
    )
    return res.data.data
  },

  async getTraceTimeline(params: ConversationTraceTimelineParams): Promise<ConversationTraceTimelineItem[]> {
    const res = await http.get<Response<ConversationTraceTimelineItem[]>>(
      `/v0/conversation/${encodeURIComponent(params.conversationId)}/trace-timeline`,
    )
    return res.data.data
  },

  async getSummaryPageState(params: ConversationSummaryPageParams): Promise<AsyncDataState<PageVO<ConversationSummary>>> {
    try {
      const data = await this.getSummaryPage(params)
      return data.data.length === 0 ? emptyState(data) : successState(data)
    } catch (error) {
      return errorState(error)
    }
  },

  async getTraceTimelineState(params: ConversationTraceTimelineParams): Promise<AsyncDataState<ConversationTraceTimelineItem[]>> {
    try {
      const data = await this.getTraceTimeline(params)
      return data.length === 0 ? emptyState(data) : successState(data)
    } catch (error) {
      return errorState(error)
    }
  },
}
