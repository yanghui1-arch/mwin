import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import SiderbarMoreActions from "./more-actions";
import type { Session } from "../types";

interface SessionSidebarProps {
  sessions: Session[];
  selectedSession: Session | undefined;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function SessionSidebar({
  sessions,
  selectedSession,
  onSelectSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-[69vh] w-[20%] flex-col min-w-0 gap-1 p-2">
      <Label className="text-muted-foreground text-xs font-bold px-1">
        {t("main.kubent.siderbar.recent")}
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
                onClick={() => onSelectSession(session.id)}
              >
                {session.title ?? ""}
              </div>
              <div className="shrink-0">
                <SiderbarMoreActions
                  session={session}
                  onDeleteSession={onDeleteSession}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
