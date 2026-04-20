import kubentApi from "./kubent-http";
import { MWIN_JWT } from "@/types/storage-const";
import type { SSEEvent } from "@/pages/kubent/types";

type ChatTaskResponse = {
  task_id: string
}

type ChatTaskStatus = {
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  content: string | undefined;
  exception_traceback: string | undefined;
  progress_info: {
    tool_names: string[] | undefined,
    content: string | undefined,
  } | undefined;
}

type Response<T> = {
  code: number;
  message: string;
  data: T
}

type KubentChatSession = {
  id: string;
  user_id: string;
  title: string | undefined;
  last_update_timestamp: string;
}

type KubentChat = {
  role: "user" | "assistant";
  content: string;
  start_timestamp: string;
}

function parseSSEEvent(rawEvent: string): SSEEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const json = dataLines.join("\n");

  try {
    return JSON.parse(json) as SSEEvent;
  } catch (error) {
    console.error("Failed to parse SSE event:", json, error);
    return null;
  }
}

export const kubentChatApi = {
  /* Get chat session */
  session(){
    return kubentApi.get<Response<KubentChatSession[]>>(
      "/query/session",
    );
  },
  createSession() {
    return kubentApi.post<Response<KubentChatSession>>(
      "/chat/create_chat_session"
    );
  },
  deleteSession(session_id: string) {
    return kubentApi.post<Response<null>>(
      "/chat/delete_session",
      { session_id }
    );
  },
  queryChats(session_id: string) {
    return kubentApi.get<Response<KubentChat[]>>(
      `/query/chats?session_id=${session_id}`,
    );
  },

  async queryChatStatus(task_id: string, signal: AbortSignal): Promise<{
    status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE",
    content: string | undefined,
    exceptionTraceback: string | undefined,
    progressInfo: {
      toolNames: string[] | undefined,
      content: string | undefined,
    } | undefined,
  }>{
    const response = await kubentApi.post<Response<ChatTaskStatus>>(
      "/chat/query_optimize_result",
      null,
      {
        params: {task_id},
        signal,
      }
    )
    return {
      status: response.data.data.status,
      content: response.data.data.content,
      exceptionTraceback: response.data.data.exception_traceback,
      progressInfo: {
        toolNames: response.data.data.progress_info?.tool_names,
        content: response.data.data.progress_info?.content,
      }
    }
  },

  chat(session_id: string | undefined, message: string, project_id: number){
    return kubentApi.post<Response<ChatTaskResponse>>(
      "/chat/optimize",
      { session_id, message, project_id }
    );
  },
  title(session_id: string, message: string) {
    return kubentApi.post<Response<string>>(
      "/chat/title",
      { session_id, message }
    );
  },

  async *optimizeStream(
    session_id: string | undefined,
    message: string,
    project_id: number,
    signal: AbortSignal,
  ): AsyncGenerator<SSEEvent> {
    const token = localStorage.getItem(MWIN_JWT);
    const res = await fetch(
      `${import.meta.env.VITE_KUBENT_API_BASE_URL}/chat/optimize/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "AT-token": token } : {}),
        },
        body: JSON.stringify({ session_id, message, project_id }),
        signal,
      }
    );
    if (!res.ok || !res.body) {
      throw new Error(`SSE request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buf += decoder.decode();
        break;
      }

      buf += decoder.decode(value, { stream: true });
      const parts = buf.split(/\r?\n\r?\n/);
      buf = parts.pop() ?? "";

      for (const part of parts) {
        const parsedEvent = parseSSEEvent(part);
        if (parsedEvent) {
          yield parsedEvent;
        }
      }
    }

    const trailingEvent = parseSSEEvent(buf.trim());
    if (trailingEvent) {
      yield trailingEvent;
    }
  },
}
