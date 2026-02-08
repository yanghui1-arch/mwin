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
    messages,
    taskId,
    callingToolInformation,
    handleSend,
  } = useKubentChat();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <PageHeader
        selectedProject={selectedProject}
        projects={projects}
        onSelectProject={selectProject}
      />
      <div className="flex gap-2 w-full">
        <SessionSidebar
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={selectSession}
          onDeleteSession={handleDeleteSession}
        />
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
  );
}
