import { DataTable } from "@/components/data-table";
import { projectColumns } from "./project-columns";
import { useEffect, useState } from "react";
import { projectApi } from "@/api/project";
import { useDataTable } from "@/hooks/use-datatable";
import { ProjectDataTableToolbar } from "@/components/data-table/data-table-toolbar/project-data-table-toolbar";
import { useTranslation } from "react-i18next";

type Project = {
  id: string;
  name: string;
  description: string;
  cost: number;
  avgDuration: number;
  lastUpdateTimestamp: string;
};

export default function ProjectsPage() {
  const [project, setProject] = useState<Project[]>([]);
  const { t } = useTranslation();

  const getProjects = async () => {
    const response = await projectApi.getAllProjects();
    if (response.data.code == 200) {
      const userProjects = response.data.data;
      const projects: Project[] = userProjects.map((p) => ({
        id: p.projectId.toString(),
        name: p.projectName,
        description: p.description,
        cost: p.cost,
        avgDuration: p.averageDuration,
        lastUpdateTimestamp: p.lastUpdateTimestamp,
      }));
      setProject(projects);
    } else if (response.data.code == 404) {
      console.warn("No projects found.");
      setProject([]);
    }
  };
  useEffect(() => {
    getProjects();
  }, []);

  const { table } = useDataTable({
    columns: projectColumns,
    data: project,
    onRefresh: getProjects,
  });

  return (
    <div className="px-4 lg:px-6">
      <h2 className="text-xl font-semibold">{t("main.projects.title")}</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("main.projects.titleDescription")}
      </p>
      <div className="container mx-auto py-5 space-y-4">
        <ProjectDataTableToolbar table={table} />
        <DataTable table={table} isNavigate={true} />
      </div>
    </div>
  );
}
