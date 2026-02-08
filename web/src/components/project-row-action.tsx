import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/pages/projects/project-columns";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useForm } from "react-hook-form";
import { projectApi } from "@/api/project";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProjectRowActionsProps {
  project: Project;
  onRefresh: () => void;
}

type UpdateParams = {
  projectDescription: string;
};

export function ProjectRowActions({ project, onRefresh }: ProjectRowActionsProps) {
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const { t } = useTranslation();
  const form = useForm<UpdateParams>({
    defaultValues: {
      projectDescription: project.description,
    }
  });

  const editUpdateSubmit = async (data: UpdateParams) => {
    console.log(data);
    console.log(project)
    try {
      const response = await projectApi.updateProjects({projectId: project.id, newDescription: data.projectDescription})
      if (response.data.code == 200) {
        toast.success(t("projectRowAction.updateSuccess"))
      } else {
        toast.error(response.data.message)
      }
      setOpenEdit(false)
      onRefresh();
    } catch (e){
      console.error("UNKNOWN ERROR: " + e)
      toast.error(t("projectRowAction.unknownError"))
    } finally {
      form.reset();
    }
  };

  const deleteProject = async (projectName: string) => {
    const response = await projectApi.deleteProject({projectName});
    setOpenDelete(false);
    if (response.data.code == 200) {
      await onRefresh();
      toast.success(response.data.data);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-40" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setOpenEdit(true)}>
              {t("projectRowAction.edit")}
              <Pencil className="ml-auto h-4 w-4" />
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setOpenDelete(true)}>
              <span className="text-red-400">{t("projectRowAction.delete")}</span>
              <Trash2 className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projectRowAction.editProject", { name: project.name })}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(editUpdateSubmit)}>
            <div className="flex flex-col gap-2">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <Label>{t("projectRowAction.projectName")}</Label>
                  <Input
                    id="name-1"
                    className="cursor-not-allowed"
                    disabled
                    value={project.name}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("projectRowAction.description")}</Label>
                  <Input
                    id="description-1"
                    {...form.register("projectDescription")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setOpenEdit(false)}>{t("projectRowAction.close")}</Button>
                <Button type="submit" variant="destructive">
                  {t("projectRowAction.update")}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">{t("projectRowAction.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("projectRowAction.deleteWarning")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProject(project.name)}
            >
              {t("projectRowAction.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
