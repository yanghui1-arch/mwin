import kubentApi from "./kubent-http";

type ChatMessage = {
  message: string
};

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
  }
}
