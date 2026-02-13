import { Code, FileSearch, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SuggestedPromptsProps {
  onPromptClick?: (prompt: string) => void;
  projectName?: string;
}

export function SuggestedPrompts({ onPromptClick, projectName }: SuggestedPromptsProps) {
  const { t } = useTranslation();

  const suggestedPrompts = [
    {
      icon: FileSearch,
      title: t("main.kubent.welcome.suggestions.analyzeProject.title"),
      prompt: t("main.kubent.welcome.suggestions.analyzeProject.prompt", {
        projectName: projectName || "project",
      }),
    },
    {
      icon: Code,
      title: t("main.kubent.welcome.suggestions.codeReview.title"),
      prompt: t("main.kubent.welcome.suggestions.codeReview.prompt"),
    },
    {
      icon: Zap,
      title: t("main.kubent.welcome.suggestions.findIssues.title"),
      prompt: t("main.kubent.welcome.suggestions.findIssues.prompt"),
    },
  ];

  return (
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {suggestedPrompts.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={index}
              onClick={() => onPromptClick?.(suggestion.prompt)}
              className={cn(
                "group relative overflow-hidden",
                "flex flex-col items-start gap-3 p-4",
                "rounded-lg border border-border/50",
                "bg-card/50 backdrop-blur-sm",
                "hover:bg-accent/50 hover:border-primary/30",
                "transition-all duration-300",
                "hover:shadow-lg hover:scale-105",
                "active:scale-100"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{suggestion.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground text-left line-clamp-2">
                {suggestion.prompt}
              </p>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-primary/5 to-transparent" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
