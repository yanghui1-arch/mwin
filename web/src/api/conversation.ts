import http from "./http"

type Response<T> = {
  code: number
  message: string
  data: T
}

export type PageVO<T> = {
  pageCount: number
  data: T[]
}

export type ConversationSummary = {
  id?: string
  conversationId?: string
  traceCount: number
  hasError?: boolean
  error?: boolean
  errorInfo?: string
  totalCost?: number
  totalTokens?: number
  startTime: string
  lastUpdateTimestamp?: string
  lastUpdatedAt?: string
}

export type ConversationPageParams = {
  projectName: string
  page: number
  pageSize: number
}

export const conversationApi = {
  async getConversations({ projectName, page, pageSize }: ConversationPageParams) {
    const response = await http.get<Response<PageVO<ConversationSummary>>>(
      `/v0/conversations/${encodeURIComponent(projectName)}`,
      { params: { page, pageSize } },
    )
    return response.data.data
  },
}
