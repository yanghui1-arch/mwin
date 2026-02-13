import { Bot, Code, FileSearch, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface WelcomePageProps {
  onSuggestedPrompt?: (prompt: string) => void;
  projectName?: string;
}

export function WelcomePage({ onSuggestedPrompt, projectName }: WelcomePageProps) {
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
    <div className="flex h-full w-full items-center justify-center animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-8 max-w-3xl px-6">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative bg-linear-to-br from-primary/90 to-primary rounded-2xl p-4 shadow-lg">
              <Bot className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("main.kubent.welcome.title")}
            </h1>
            {projectName && (
              <p className="text-lg text-muted-foreground">
                {t("main.kubent.welcome.readyToExplore")}{" "}
                <span className="font-semibold text-foreground">{projectName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-muted-foreground max-w-lg animate-in slide-in-from-bottom-4 duration-700 delay-200">
          {t("main.kubent.welcome.description")}
        </p>

        {/* Suggested Prompts */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-bottom-4 duration-700 delay-300">
          {suggestedPrompts.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={index}
                onClick={() => onSuggestedPrompt?.(suggestion.prompt)}
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

        {/* Footer hint */}
        <div className="text-center text-sm text-muted-foreground/70 animate-in fade-in duration-700 delay-500">
          {t("main.kubent.welcome.footer")}
        </div>
      </div>
    </div>
  );
}
