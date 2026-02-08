import { useEffect, useState } from "react";
import { projectApi } from "@/api/project";
import { kubentChatApi } from "@/api/kubent/kubent-chat";
import { useTaskPolling, type TaskStatus } from "@/hooks/use-task";
import type {
  ChatMessage,
  Session,
  Project,
  TaskStatusResponse,
  TaskProgressData,
} from "./types";

export function useKubentChat() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | undefined>(
    undefined
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Track chat with Kubent task status.
  const [taskId, setTaskId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [callingToolInformation, setCallingToolInformation] = useState<
    string | undefined
  >(undefined);

  const fetchTaskStatus = async (
    taskId: string,
    signal: AbortSignal
  ): Promise<TaskStatus<TaskProgressData>> => {
    const taskStatus: TaskStatusResponse = await kubentChatApi.queryChatStatus(
      taskId,
      signal
    );

    return {
      status: taskStatus.status,
      data: {
        content: taskStatus.content,
        exceptionTraceback: taskStatus.exceptionTraceback,
        progressInfo: taskStatus.progressInfo,
      },
    };
  };

  const onTaskDone = (_taskStatus: TaskStatus<TaskProgressData>) => {
    void _taskStatus;
    setEnabled(false);
    setTaskId(null);
    setCallingToolInformation(undefined);
  };

  const onTaskUpdate = (taskStatus: TaskStatus<TaskProgressData>) => {
    const status = taskStatus.status;
    if (status === "PROGRESS") {
      setCallingToolInformation(taskStatus.data.progressInfo?.content);
    } else if (status === "SUCCESS") {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: taskStatus.data.content as string,
        startTimestamp: new Date().toLocaleString("sv-SE"),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  // TODO: Add an update message callback.

  useTaskPolling({
    taskId,
    enabled,
    fetchStatus: fetchTaskStatus,
    intervalMs: 300,
    onUpdate: onTaskUpdate,
    onDone: onTaskDone,
  });

  const selectProject = (projectName: string) =>
    setSelectedProject(projects.find((p: Project) => p.name === projectName));

  const selectSession = async (sessionId: string) => {
    setSelectedSession(sessions.find((session) => session.id === sessionId));
    try {
      const response = await kubentChatApi.queryChats(sessionId);
      if (response.data.code === 200) {
        const data = response.data.data;
        setMessages(
          data
            .sort(
              (a, b) =>
                new Date(a.start_timestamp).getTime() -
                new Date(b.start_timestamp).getTime()
            )
            .map((chat) => {
              return {
                role: chat.role,
                content: chat.content,
                startTimestamp: chat.start_timestamp,
              };
            })
        );
      } else {
        console.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const response = { data: { code: 200, message: "Success" } };
    if (response.data.code !== 200) {
      throw new Error(response.data.message || "Failed to delete session.");
    }

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    setSessions(nextSessions);
    // Delete session is current session
    if (selectedSession?.id === sessionId) {
      console.log("clear");
      setSelectedSession(undefined);
      setMessages([]);
    }
  };

  const handleSend = async (inputValue: string) => {
    if (!selectedProject) return;
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim(),
      startTimestamp: new Date().toLocaleString("sv-SE"),
    };
    setMessages((prev) => [...prev, userMessage]);
    let session: Session | undefined = selectedSession;
    if (!session) {
      const createSessionResponse = await kubentChatApi.createSession();
      if (createSessionResponse.data.code === 200) {
        const newSession = createSessionResponse.data.data;
        session = {
          id: newSession.id,
          userId: newSession.user_id,
          title: newSession.title,
          lastUpdateTimestamp: newSession.last_update_timestamp,
        };
      } else {
        throw new Error(
          "Failed to create a new chat. Please retry after a moment."
        );
      }
    }
    const [chatResponse, titleResponse] = await Promise.all([
      kubentChatApi.chat(session.id, inputValue, selectedProject.id),
      kubentChatApi.title(session.id, inputValue.trim()),
    ]);
    // if (chatResponse.data.code === 200) {
    //   const assistantMessage: ChatMessage = {
    //     role: "assistant",
    //     content: chatResponse.data.data.message,
    //     startTimestamp: new Date().toLocaleString("sv-SE"),
    //   };
    //   setMessages((prev) => [...prev, assistantMessage]);
    // }
    if (chatResponse.data.code === 200) {
      const task_id = chatResponse.data.data.task_id;
      setTaskId(task_id);
      setEnabled(true);
    } else {
      setTaskId(null);
      setEnabled(false);
      setCallingToolInformation(undefined);
    }

    if (titleResponse.data.code === 200) {
      const title: string = titleResponse.data.data;
      session = { ...session, title };
      setSelectedSession(session);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAllProjects();
        if (response.data.code === 200) {
          const userProjects = response.data.data;
          const availableProjects: Project[] = userProjects.map((p) => {
            return {
              id: p.projectId,
              name: p.projectName,
            };
          });
          setProjects(availableProjects);
          if (availableProjects.length > 0) {
            setSelectedProject(availableProjects[0]);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    const fetchSessions = async () => {
      try {
        const response = await kubentChatApi.session();
        if (response.data.code === 200) {
          const sessionData = response.data.data;
          setSessions(
            sessionData
              .sort(
                (a, b) =>
                  new Date(b.last_update_timestamp).getTime() -
                  new Date(a.last_update_timestamp).getTime()
              )
              .map((session) => {
                return {
                  id: session.id,
                  userId: session.user_id,
                  title: session.title,
                  lastUpdateTimestamp: session.last_update_timestamp,
                };
              })
          );
        } else {
          console.error(response.data.message);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchProjects();
    fetchSessions();
  }, []);

  return {
    projects,
    selectedProject,
    selectProject,
    sessions,
    selectedSession,
    selectSession,
    handleDeleteSession,
    messages,
    taskId,
    callingToolInformation,
    handleSend,
  };
}
