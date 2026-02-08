import { type Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { projectApi } from "@/api/project";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProjectDataTableToolbarProps<TData> {
  table: Table<TData>;
}

type Inputs = {
  projectName: string;
  projectDescription: string;
};

export function ProjectDataTableToolbar<TData>({
  table,
}: ProjectDataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const form = useForm<Inputs>();
  const [openCreateProjectDialog, setOpenCreateProjectDialog] = useState(false);
  const { t } = useTranslation();

  const createProjectSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      console.log("request body" + JSON.stringify(data));
      const response = await projectApi.createNewProject(data);
      if (response.data.code == 200) {
        table.options.meta?.onRefresh?.();
        setOpenCreateProjectDialog(false);
        toast.success(t("main.projects.toolbar.congratsCreate", { name: form.getValues("projectName") }))
      }
    } catch (error) {
      toast.error(t("main.projects.toolbar.failedCreate", { name: form.getValues("projectName") }))
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={t("main.projects.toolbar.filterProjects")}
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            {t("common.reset")}
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <Button size="sm" onClick={() => setOpenCreateProjectDialog(true)}>
          {t("main.projects.toolbar.createProject")}
        </Button>
        <Dialog
          open={openCreateProjectDialog}
          onOpenChange={setOpenCreateProjectDialog}
        >
          <DialogContent className="sm:max-w-md">
            <form onSubmit={form.handleSubmit(createProjectSubmit)}>
              <div className="flex flex-col gap-2">
                <DialogHeader>
                  <DialogTitle>{t("main.projects.toolbar.createProject")}</DialogTitle>
                  <DialogDescription>
                    {t("main.projects.toolbar.createProjectDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label>{t("main.projects.toolbar.projectName")}</Label>
                    <Input
                      id="name-1"
                      placeholder={t("main.projects.toolbar.newProjectName")}
                      {...form.register("projectName")}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label>{t("main.projects.toolbar.description")}</Label>
                    <Input
                      id="username-1"
                      placeholder={t("main.projects.toolbar.briefDescription")}
                      {...form.register("projectDescription")}
                    />
                  </div>
                </div>

                <DialogFooter className="justify-between">
                  <DialogClose asChild>
                    <Button type="button" variant="destructive">
                      {t("common.cancel")}
                    </Button>
                  </DialogClose>
                  <Button type="submit" variant="secondary">
                    {t("common.create")}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
