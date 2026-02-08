import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

type ChatInputProps = {
  onSend: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type ChatInputToolBarProps = {
  onSend: () => void;
  disabled?: boolean;
};

export function ChatInputToolBar({ onSend, disabled }: ChatInputToolBarProps) {
  return (
    <div className="flex items-center justify-end gap-2 dark:bg-input/30 bg-transparent px-2 py-2">
      <Button
        type="button"
        onClick={onSend}
        disabled={disabled}
        size="icon"
        className="h-9 w-9 rounded-full"
        aria-label="Send message"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ChatInput({ onSend, placeholder, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const handleSend = () => {
    const value = textareaRef.current?.value?.trim();
    if (!value) return;

    onSend(value);

    // clear without re-render
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto"
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.2) + "px"
  }

  return (
    <div className="w-full overflow-hidden rounded-md border bg-background">
      <Textarea
        ref={textareaRef}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t("chat.placeholder")}
        disabled={disabled}
        rows={1}
        onInput={autoResize}
        className="border-0 bg-transparent pt-3 pb-2 shadow-none focus-visible:ring-0 resize-none max-h-[20vh] min-h-[2.75rem] overflow-y-auto"
      />
      <ChatInputToolBar onSend={handleSend} disabled={disabled} />
    </div>
  );
}
