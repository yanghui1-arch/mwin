import { type CompletionUsage } from "openai/resources/index.mjs";
import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, List } from "lucide-react";
import i18n from "@/i18n";

export type Step = {
  id: string;
  parentStepId: string | null;
  name: string;
  type: "general" | "llm" | "retrieve" | "tool";
  tags: Array<string>;
  errorInfo: string | null;
  model: string | null;
  usage: CompletionUsage | null;
  cost: number | null;
  startTime: string;
  endTime: string | null;
};

export const stepColumns: ColumnDef<Step>[] = [
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
    accessorKey: "id",
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
            <span className="font-semibold">ID</span>
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
    cell: ({row}) => {

      return (
        <div className="w-40 truncate justify-center">
          {row.original.id}
        </div>
      )
    },
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
            <span className="font-semibold">{i18n.t("track.columns.name")}</span>
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
    accessorKey: "startTime",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.startTime")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const startTime = row.original.startTime;
      // sv-SE locale produces ISO format; replace "T" with " " to keep YYYY-MM-DD HH:mm:ss
      const formatted = startTime ? new Date(startTime).toLocaleString("sv-SE").replace("T", " ") : "";
      return <div className="text-center font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "endTime",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.endTime")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const endTime = row.original.endTime;
      // sv-SE locale produces ISO format; replace "T" with " " to keep YYYY-MM-DD HH:mm:ss
      const formatted = endTime ? new Date(endTime).toLocaleString("sv-SE").replace("T", " ") : "";
      return <div className="text-center font-medium">{formatted}</div>;
    },
  },
];
