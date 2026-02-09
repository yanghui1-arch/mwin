import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Markdown } from "../markdown";
import { useTranslation } from "react-i18next";

type ChatBubbleProps = {
  content: string;
  className?: string;
};

type ToolChatBubbleProps = {
  content: string;
};

const TOOL_TYPING_SPEED_MS = 18;

export function AssistantChatBubble({ content, className }: ChatBubbleProps) {
  return (
    <div className={cn("flex w-full justify-center", className)}>
      <div className="w-full max-w-5xl text-sm leading-relaxed text-justify">
        <Markdown content={content} />
      </div>
    </div>
  );
}

export function ToolChatBubble({ content }: ToolChatBubbleProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
  }, [content]);

  useEffect(() => {
    if (!content || visibleCount >= content.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 1, content.length));
    }, TOOL_TYPING_SPEED_MS);

    return () => clearTimeout(timeout);
  }, [content, visibleCount]);

  const displayedContent = useMemo(
    () => content.slice(0, visibleCount),
    [content, visibleCount]
  );

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-5xl text-left text-sm leading-relaxed">
        <div className="rounded-2xl bg-muted/30 px-4 py-3">
          <div className="animate-pulse">
            <Markdown content={displayedContent} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThinkingBubble() {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);

    const interval = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-5xl text-left text-sm leading-relaxed">
        <div className="rounded-2xl bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t("chat.thinking")}
            </span>
            <span className="flex items-center gap-0.5">
              <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </span>
            <span className="text-muted-foreground/50 ml-auto text-xs tabular-nums">
              {elapsed.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserChatBubble({ content, className }: ChatBubbleProps) {
  return (
    <div className={cn("flex items-start justify-end gap-3", className)}>
      <Card className="max-w-[80%] bg-muted/60 p-3 text-sm leading-relaxed">
        <Markdown content={content} />
      </Card>
    </div>
  );
}
