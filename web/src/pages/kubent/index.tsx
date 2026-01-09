import { projectApi } from "@/api/project";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { AssistantChatBubble, UserChatBubble } from "@/components/chat/bubble";
import { ChatInput } from "@/components/chat/input";
import { Label } from "@/components/ui/label";
import { kubentChatApi } from "@/api/kubent/kubent-chat";
import { cn } from "@/lib/utils";
import SiderbarMoreActions from "./siderbar/more-actions";
import { useTaskPolling, type TaskStatus } from "@/hooks/use-task";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  startTimestamp: string;
};

type Session = {
  id: string;
  userId: string;
  title: string | undefined;
  lastUpdateTimestamp: string;
};

type Project = {
  id: number;
  name: string;
};

type TaskStatusResponse = {
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILED";
  content: string | undefined;
  exceptionTraceback: string | undefined;
  progressInfo: string | undefined;
}

type TaskProgressData = {
  content: string | undefined;
  exceptionTraceback: string | undefined;
  progressInfo: string | undefined;
}

export default function KubentPage() {
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

  const fetchTaskStatus = async (taskId: string, signal: AbortSignal): Promise<TaskStatus<TaskProgressData>> => {
    const taskStatus: TaskStatusResponse = await kubentChatApi.queryChatStatus(taskId, signal);

    return {
      status: taskStatus.status,
      data: {
        content: taskStatus.content,
        exceptionTraceback: taskStatus.exceptionTraceback,
        progressInfo: taskStatus.progressInfo,
      }
    }
  }

  
  const onTaskDone = (_taskStatus: TaskStatus<TaskProgressData>) => {
    void _taskStatus;
    setEnabled(false);
    setTaskId(null);
  }

  // TODO: Add an update message callback.

  useTaskPolling({
    taskId,
    enabled,
    fetchStatus: fetchTaskStatus,
    intervalMs: 300,
    onDone: onTaskDone,
  })

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

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold">Kubent</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {selectedProject?.name
            ? `Chatting about ${selectedProject.name}.`
            : "Select a project to chat with Kubent to optimize your agent system."}
        </p>
      </div>

      <div className="flex gap-2 lg:flex-row lg:items-center">
        <Label>Select one project</Label>
        <Select onValueChange={selectProject} value={selectedProject?.name}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Select a project to optimize" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Projects</SelectLabel>
              {projects.map((project: Project) => (
                <SelectItem key={project.id} value={project.name}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex h-[69vh] w-[20%] flex-col min-w-0 gap-1 p-2">
          <Label className="text-muted-foreground text-xs font-bold px-1">
            Recent
          </Label>
          <ScrollArea className="w-full h-full rounded-md  [&>[data-radix-scroll-area-viewport]>div]:block! [&>[data-radix-scroll-area-viewport]>div]:w-full!">
            <div className="flex flex-col gap-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    `
                      flex items-center justify-between gap-2
                      min-h-9
                      px-1 py-2 rounded-md
                      cursor-pointer select-none
                      text-sm
                      hover:bg-accent hover:text-accent-foreground
                      active:bg-accent/80
                    `,
                    selectedSession?.id === session.id &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  <div
                    className="min-w-0 flex-1 truncate"
                    onClick={() => selectSession(session.id)}
                  >
                    {session.title ?? ""}
                  </div>
                  <div className="shrink-0">
                    <SiderbarMoreActions
                      session={session}
                      onDeleteSession={handleDeleteSession}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex h-[69vh] w-[80%] min-w-0 flex-col gap-4 p-2">
          <ScrollArea className="flex-1 min-h-0">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-2">
              {messages.map((message) =>
                message.role === "assistant" ? (
                  <AssistantChatBubble content={message.content} />
                ) : (
                  <UserChatBubble content={message.content} />
                )
              )}
            </div>
          </ScrollArea>

          <div className="mx-auto w-full max-w-4xl">
            <ChatInput
              onSend={handleSend}
              placeholder={
                selectedProject?.name
                  ? `Ask Kubent about ${selectedProject.name}`
                  : "Select a project to start chatting with Kubent"
              }
              disabled={!selectedProject}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
