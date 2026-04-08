import { FolderOpen, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Project } from "../types"

interface PromptsPageHeaderProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onOpenCreatePrompt: () => void
}

export function PromptsPageHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreatePrompt,
}: PromptsPageHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t("prompts.title")}</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">{t("prompts.description")}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={onOpenCreatePrompt}
          disabled={!selectedProjectId}
        >
          <Plus className="size-3.5" />
          {t("prompts.createPrompt.button")}
        </Button>

        <div className="flex items-center gap-2 shrink-0">
          <FolderOpen className="size-4 text-muted-foreground" />
          <Select value={selectedProjectId ?? ""} onValueChange={onSelectProject}>
            <SelectTrigger className="h-9 w-[220px] text-sm">
              <SelectValue placeholder={t("prompts.selectProject")} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
