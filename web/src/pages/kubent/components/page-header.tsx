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
    <>
      <div>
        <h2 className="text-xl font-semibold">{t("main.kubent.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {selectedProject?.name
            ? `${t("main.kubent.titleDescription", { projectName: selectedProject.name })}`
            : "Select a project to chat with Kubent to optimize your agent system."}
        </p>
      </div>

      <div className="flex gap-2 lg:flex-row lg:items-center">
        <Label>{t("main.kubent.select")}</Label>
        <Select onValueChange={onSelectProject} value={selectedProject?.name}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Select a project to optimize" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Projects</SelectLabel>
              {projects.map((project: Project) => (
                <SelectItem key={project.id} value={project.name}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
