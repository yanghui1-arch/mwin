import { PageHeader } from "./components/page-header";
import { SessionSidebar } from "./components/session-sidebar";
import { ChatArea } from "./components/chat-area";
import { useKubentChat } from "./use-kubent-chat";

export default function KubentPage() {
  const {
    projects,
    selectedProject,
    selectProject,
    sessions,
    selectedSession,
    selectSession,
    handleDeleteSession,
    handleNewChat,
    messages,
    taskId,
    callingToolInformation,
    handleSend,
  } = useKubentChat();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6 h-[calc(100vh-7rem)] overflow-hidden">
      <PageHeader
        selectedProject={selectedProject}
        projects={projects}
        onSelectProject={selectProject}
      />
      {/* Main content area: 2:8 ratio for sidebar:chat */}
      <div className="flex gap-2 w-full flex-1 overflow-hidden">
        <div className="w-1/5 shrink-0 h-full overflow-hidden">
          <SessionSidebar
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={selectSession}
            onDeleteSession={handleDeleteSession}
            onNewChat={handleNewChat}
          />
        </div>
        <div className="flex-1 min-w-0 h-full">
          <ChatArea
            messages={messages}
            taskId={taskId}
            callingToolInformation={callingToolInformation}
            selectedProjectName={selectedProject?.name}
            disabled={!selectedProject}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
