import { TrendingUp, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export type PromptViewMode = "performance" | "prompt"

interface ViewToggleProps {
  value: PromptViewMode
  onChange: (v: PromptViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/40 border border-border/50 rounded-xl p-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange("performance")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150",
          value === "performance"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <TrendingUp className="size-3.5" />
        Performance
      </button>
      <button
        type="button"
        onClick={() => onChange("prompt")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150",
          value === "prompt"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <FileText className="size-3.5" />
        Prompt
      </button>
    </div>
  )
}
