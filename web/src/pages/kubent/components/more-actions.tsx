import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "../types";
import { useTranslation } from "react-i18next";

interface SiderbarMoreActionsProps {
  session: Session;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export default function SiderbarMoreActions({
  session,
  onDeleteSession,
}: SiderbarMoreActionsProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslation();

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteSession(session.id);
      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(event) => event.stopPropagation()}
            aria-label="Session actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400"
              onSelect={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-red-400" />
              <span>{t("main.kubent.moreActions.delete")}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle>{t("main.kubent.moreActions.deleteSession")}</DialogTitle>
          <DialogDescription>
            {t("main.kubent.moreActions.deleteSessionDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isDeleting}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? t("main.kubent.moreActions.deleting") : t("main.kubent.moreActions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
