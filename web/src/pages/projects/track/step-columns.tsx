import { type CompletionUsage } from "openai/resources/index.mjs";
import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableHeader } from "@/components/sortable-header";
import i18n from "@/i18n";
import { formatByteSize } from "@/lib/format";

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
  /** Raw byte size of the step payload (input + output). Null until the backend reports it. */
  payloadSize: number | null;
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
    header: ({ column }) => <SortableHeader label="ID" column={column} />,
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
    header: ({ column }) => (
      <SortableHeader label={i18n.t("track.columns.name")} column={column} />
    ),
  },
  {
    accessorKey: "payloadSize",
    id: "size",
    header: ({ column }) => (
      <SortableHeader
        label={i18n.t("track.columns.size")}
        tooltip={i18n.t("track.columns.sizeHint.step")}
        column={column}
      />
    ),
    cell: ({ row }) => {
      const { payloadSize } = row.original;
      return (
        <div className="text-center font-mono text-sm font-medium tabular-nums">
          {formatByteSize(payloadSize)}
        </div>
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
