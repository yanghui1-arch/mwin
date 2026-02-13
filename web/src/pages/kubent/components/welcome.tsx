import { Bot, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WelcomePageProps {
  projectName?: string;
}

export function WelcomePage({ projectName }: WelcomePageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
      {/* Logo */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
        <div className="relative bg-linear-to-br from-primary/90 to-primary rounded-2xl p-4 shadow-lg">
          <Bot className="h-10 w-10 text-primary-foreground" />
        </div>
      </div>

      {/* Title & Description */}
      <div className="text-center space-y-3 max-w-2xl px-6">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold text-foreground">
            {t("main.kubent.welcome.title")}
          </h1>
        </div>

        {projectName && (
          <p className="text-base text-muted-foreground">
            {t("main.kubent.welcome.readyToExplore")}{" "}
            <span className="font-semibold text-foreground">{projectName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
