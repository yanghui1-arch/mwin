import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AssistantChatBubble,
  ThinkingBubble,
  ToolChatBubble,
  UserChatBubble,
} from "@/components/chat/bubble";
import { ChatInput } from "@/components/chat/input";
import { WelcomePage } from "./welcome";
import { SuggestedPrompts } from "./suggested-prompts";
import type { ChatMessage } from "../types";

interface ChatAreaProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  callingToolInformation: string | undefined;
  thinkingInformation: string | undefined;
  selectedProjectName: string | undefined;
  disabled: boolean;
  onSend: (inputValue: string) => Promise<void>;
}

const SCROLL_BOTTOM_THRESHOLD = 50;

export function ChatArea({
  messages,
  isStreaming,
  callingToolInformation,
  thinkingInformation,
  selectedProjectName,
  disabled,
  onSend,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const hasMessages = messages.length > 0;
  const hasAssistantMessage =
    messages[messages.length - 1]?.role === "assistant" &&
    Boolean(messages[messages.length - 1]?.content);
  const showToolBubble = isStreaming && Boolean(callingToolInformation);
  const showThinkingBubble = isStreaming && Boolean(thinkingInformation);
  const showFallbackThinking =
    isStreaming && !showToolBubble && !showThinkingBubble && !hasAssistantMessage;

  const handleSuggestedPrompt = async (prompt: string) => {
    setIsTransitioning(true);
    // Wait for animation to complete before sending
    await new Promise((resolve) => setTimeout(resolve, 500));
    await onSend(prompt);
  };

  const handleSend = async (inputValue: string) => {
    setIsTransitioning(true);
    // Wait for animation to complete before sending
    await new Promise((resolve) => setTimeout(resolve, 500));
    await onSend(inputValue);
  };

  const getViewport = useCallback(
    () =>
      scrollRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      ),
    []
  );

  // Track whether the user is scrolled to the bottom
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      setIsAtBottom(
        scrollHeight - scrollTop - clientHeight < SCROLL_BOTTOM_THRESHOLD
      );
    };
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [getViewport]);

  // Auto-scroll to bottom when content changes, only if user was at bottom
  useEffect(() => {
    if (!isAtBottom) return;
    const viewport = getViewport();
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming, callingToolInformation, thinkingInformation, isAtBottom, getViewport]);

  // Reset transition state when messages appear
  useEffect(() => {
    if (hasMessages) {
      setIsTransitioning(false);
    }
  }, [hasMessages]);

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-4 p-2">
      {!hasMessages && !isTransitioning ? (
        // Initial centered layout
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8">
          <WelcomePage projectName={selectedProjectName} />

          <div className="w-full max-w-4xl animate-in fade-in duration-700 delay-100">
            <ChatInput
              onSend={handleSend}
              placeholder={
                selectedProjectName
                  ? `Ask Kubent about ${selectedProjectName}`
                  : "Select a project to start chatting with Kubent"
              }
              disabled={disabled}
            />
          </div>

          <div className="animate-in fade-in duration-700 delay-200">
            <SuggestedPrompts
              onPromptClick={handleSuggestedPrompt}
              projectName={selectedProjectName}
            />
          </div>
        </div>
      ) : (
        // Chat layout with animation transition
        <>
          <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-2 pr-4 h-full">
              {hasMessages && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                  {messages.map((message, index) => {
                    const isStreamingAssistantMessage =
                      isStreaming &&
                      message.role === "assistant" &&
                      index === messages.length - 1;

                    return message.role === "assistant" ? (
                      <AssistantChatBubble
                        key={index}
                        content={message.content}
                        typing={isStreamingAssistantMessage}
                      />
                    ) : (
                      <UserChatBubble key={index} content={message.content} />
                    );
                  })}
                  {showToolBubble && (
                    <ToolChatBubble content={callingToolInformation ?? ""} />
                  )}
                  {showThinkingBubble && (
                    <ThinkingBubble content={thinkingInformation} />
                  )}
                  {showFallbackThinking && <ThinkingBubble />}
                </div>
              )}
            </div>
          </ScrollArea>

          <div
            className={`mx-auto w-full max-w-4xl transition-all duration-500 ease-in-out ${
              isTransitioning ? "animate-in slide-in-from-top-10" : ""
            }`}
          >
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
        </>
      )}
    </div>
  );
}

