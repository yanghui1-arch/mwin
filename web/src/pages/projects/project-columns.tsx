import { ProjectRowActions } from "@/components/project-row-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import {
  ArrowUp,
  ArrowDown,
  List,
  Clock,
  DollarSign,
} from "lucide-react";
import i18n from "@/i18n";

export type Project = {
  id: string,
  name: string;
  description: string;
  cost: number;
  avgDuration: number;
  lastUpdateTimestamp: string;
};

export const projectColumns: ColumnDef<Project>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <span className="w-4 inline-flex justify-end">
              <List className="h-4 w-4" />
            </span>
            <span className="font-semibold">{i18n.t("main.projects.columns.name")}</span>
            <span className="w-4 inline-flex justify-start">
              {column.getIsSorted() === "asc" ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </span>
          </span>
        </Button>
      );
    },
  },
  {
    accessorKey: "avgDuration",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span className="font-semibold">{i18n.t("main.projects.columns.avgDuration")}</span>
        </span>
      </div>
    ),
    cell: ({ row }) => {
      const avgDuration = row.original.avgDuration;
      return <div className="font-medium">{avgDuration + "s"}</div>;
    },
  },
  {
    accessorKey: "cost",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="inline-flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span className="font-semibold">{i18n.t("main.projects.columns.cost")}</span>
        </span>
      </div>
    ),
    cell: ({ row }) => {
      const cost = parseFloat(row.getValue("cost"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cost);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "lastUpdateTimestamp",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("main.projects.columns.lastUpdate")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const lastUpdateTimestamp = row.getValue("lastUpdateTimestamp") as string;
      return (
        <div className="text-center font-medium">{lastUpdateTimestamp}</div>
      );
    },
  },
  {
    id: "action",
    cell: ({ row, table }) => <ProjectRowActions project={row.original} onRefresh={() => table.options.meta?.onRefresh?.()}/>,
  },
];
