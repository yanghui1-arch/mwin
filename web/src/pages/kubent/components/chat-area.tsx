import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AssistantChatBubble,
  ThinkingBubble,
  ToolChatBubble,
  UserChatBubble,
} from "@/components/chat/bubble";
import { ChatInput } from "@/components/chat/input";
import type { ChatMessage } from "../types";

interface ChatAreaProps {
  messages: ChatMessage[];
  taskId: string | null;
  callingToolInformation: string | undefined;
  selectedProjectName: string | undefined;
  disabled: boolean;
  onSend: (inputValue: string) => Promise<void>;
}

export function ChatArea({
  messages,
  taskId,
  callingToolInformation,
  selectedProjectName,
  disabled,
  onSend,
}: ChatAreaProps) {
  return (
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
          {taskId && <ThinkingBubble />}
          {taskId && callingToolInformation && (
            <ToolChatBubble content={callingToolInformation} />
          )}
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-4xl">
        <ChatInput
          onSend={onSend}
          placeholder={
            selectedProjectName
              ? `Ask Kubent about ${selectedProjectName}`
              : "Select a project to start chatting with Kubent"
          }
          disabled={disabled}
        />
      </div>
    </div>
  );
}
