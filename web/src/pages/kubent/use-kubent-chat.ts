import { useEffect, useRef, useState } from "react";
import { projectApi } from "@/api/project";
import { kubentChatApi } from "@/api/kubent/kubent-chat";
import type { ChatMessage, Session, Project } from "./types";

export function useKubentChat() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | undefined>(
    undefined
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [callingToolInformation, setCallingToolInformation] = useState<
    string | undefined
  >(undefined);
  const [thinkingInformation, setThinkingInformation] = useState<
    string | undefined
  >(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const selectProject = (projectName: string) => {
    localStorage.setItem("kubent:selectedProjectName", projectName);
    setSelectedProject(projects.find((p: Project) => p.name === projectName));
  };

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
    const response = await kubentChatApi.deleteSession(sessionId);
    if (response.data.code !== 200) {
      throw new Error(response.data.message || "Failed to delete session.");
    }

    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (selectedSession?.id === sessionId) {
      setSelectedSession(undefined);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    setSelectedSession(undefined);
    setMessages([]);
    setIsStreaming(false);
    setCallingToolInformation(undefined);
    setThinkingInformation(undefined);
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
    setIsStreaming(true);
    setCallingToolInformation(undefined);
    setThinkingInformation(undefined);

    let session: Session | undefined = selectedSession;
    let isNewSession = false;
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
        isNewSession = true;
        setSelectedSession(session);
      } else {
        throw new Error("Failed to create a new chat. Please retry after a moment.");
      }
    }

    const titleResponse = await kubentChatApi.title(session.id, inputValue.trim());
    if (titleResponse.data.code === 200) {
      const title: string = titleResponse.data.data;
      session = { ...session, title };
      setSelectedSession(session);
      if (isNewSession) {
        setSessions((prev) => [session!, ...prev]);
      }
    }

    // Start SSE stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let thinkingAccumulated = "";
      let answerAccumulated = "";
      let assistantStartTimestamp: string | undefined;

      const upsertAssistantMessage = (content: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;

          if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
            updated[lastIndex] = { ...updated[lastIndex], content };
            return updated;
          }

          if (!assistantStartTimestamp) {
            assistantStartTimestamp = new Date().toLocaleString("sv-SE");
          }

          updated.push({
            role: "assistant",
            content,
            startTimestamp: assistantStartTimestamp,
          });
          return updated;
        });
      };

      for await (const event of kubentChatApi.optimizeStream(
        session.id,
        inputValue.trim(),
        selectedProject.id,
        controller.signal,
      )) {
        if (event.type === "PROGRESS") {
          if (event.tool_names && event.tool_names.length > 0) {
            setCallingToolInformation(`Using tools: ${event.tool_names.join(", ")}`);
          }

          if (event.delta) {
            thinkingAccumulated += event.delta;
            setThinkingInformation(thinkingAccumulated);
          }

          if (event.answer_delta) {
            answerAccumulated += event.answer_delta;
            setCallingToolInformation(undefined);
            setThinkingInformation(undefined);
            upsertAssistantMessage(answerAccumulated);
          }

          if (event.answer) {
            answerAccumulated = event.answer;
            setCallingToolInformation(undefined);
            setThinkingInformation(undefined);
            upsertAssistantMessage(answerAccumulated);
          }
        } else if (event.type === "DONE") {
          break;
        } else if (event.type === "ERROR") {
          console.error("SSE error:", event.detail);
          break;
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Stream error:", err);
      }
    } finally {
      setIsStreaming(false);
      setCallingToolInformation(undefined);
      setThinkingInformation(undefined);
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
            const cachedName = localStorage.getItem("kubent:selectedProjectName");
            const cached = cachedName && availableProjects.find((p) => p.name === cachedName);
            setSelectedProject(cached || availableProjects[0]);
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
    handleNewChat,
    messages,
    isStreaming,
    callingToolInformation,
    thinkingInformation,
    handleSend,
  };
}
