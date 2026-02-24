import { type Table } from "@tanstack/react-table";
import { Trash, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/**
 * @param table tanstack table
 * @param onDelete delete row callback function. Parameter is a list of string which is id to delete. Argument is passed by this component.
 */
interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onDelete: (idsToDelete: string[]) => Promise<number>;
}

export function DataTableToolbar<TData>({
  table,
  onDelete,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const isSelected = table.getSelectedRowModel().rows.length > 0;
  const { t } = useTranslation();

  const deleteRows = async () => {
    const idsToDelete: string[] = table.getSelectedRowModel().rows.map((row) => row.id);
    if (idsToDelete.length == 0) return ;
    try {
      const count = await onDelete(idsToDelete);
      table.resetRowSelection();
      await table.options.meta?.onRefresh?.();
      toast.success(t("dataTable.deleteSuccess", { count }));
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={t("dataTable.filterProjects")}
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
        {isSelected && (
          <Button
            variant="ghost"
            onClick={deleteRows}
            className="h-8 px-2 lg:px-3"
          >
            <Trash />
          </Button>
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
