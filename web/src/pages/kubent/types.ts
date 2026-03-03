export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  startTimestamp: string;
};

export type Session = {
  id: string;
  userId: string;
  title: string | undefined;
  lastUpdateTimestamp: string;
};

export type Project = {
  id: number;
  name: string;
};

export type TaskStatusResponse = {
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  content: string | undefined;
  exceptionTraceback: string | undefined;
  progressInfo:
    | {
        toolNames: string[] | undefined;
        content: string | undefined;
      }
    | undefined;
};

export type TaskProgressData = {
  content: string | undefined;
  exceptionTraceback: string | undefined;
  progressInfo:
    | {
        toolNames: string[] | undefined;
        content: string | undefined;
      }
    | undefined;
};

export type SSEEvent = {
  type: "PROGRESS" | "DONE" | "ERROR";
  delta: string | null;
  answer_delta: string | null;
  tool_names: string[] | null;
  answer: string | null;
  detail: string | null;
};
