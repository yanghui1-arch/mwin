import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import type { Project } from "../types";

interface PageHeaderProps {
  selectedProject: Project | undefined;
  projects: Project[];
  onSelectProject: (projectName: string) => void;
}

export function PageHeader({
  selectedProject,
  projects,
  onSelectProject,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 lg:flex-row lg:items-center">
      <Label>{t("main.kubent.select")}</Label>
      <Select onValueChange={onSelectProject} value={selectedProject?.name}>
        <SelectTrigger className="w-full lg:w-[150px]">
          <SelectValue placeholder={t("main.kubent.selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("main.kubent.projects")}</SelectLabel>
            {projects.map((project: Project) => (
              <SelectItem key={project.id} value={project.name}>
                {project.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
