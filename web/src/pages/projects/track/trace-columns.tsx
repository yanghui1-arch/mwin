import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import i18n from "@/i18n";

interface TraceOutput {
  llm_outputs: Record<string, unknown>;
  func_output: Record<string, unknown>;
}

export type Trace = {
  id: string;
  name: string;
  tags: string[];
  input?: Record<string, unknown>;
  output?: TraceOutput;
  errorInfo?: string;
  startTime: string;
  lastUpdateTimestamp: string;
};

export const traceColumns: ColumnDef<Trace>[] = [
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
    cell: ({ row }) => {
      return (
        <div className="w-40 truncate justify-center">{row.original.id}</div>
      );
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
    accessorKey: "input",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.input")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const traceInput = row.original.input;

      return (
        <div className="flex gap-2 justify-center">
          <ScrollArea className="h-20 w-58 rounded-md p-4 ">
            <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words text-left">
              <code>{JSON.stringify(traceInput, null, 2)}</code>
            </pre>
          </ScrollArea>
        </div>
      );
    },
  },
  {
    accessorKey: "output",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.output")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const traceOutput = row.original.output;

      return (
        <div className="flex gap-2 justify-center">
          <ScrollArea className="h-20 w-58 rounded-md p-4 ">
            <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words text-left">
              <code>{JSON.stringify(traceOutput, null, 2)}</code>
            </pre>
          </ScrollArea>
        </div>
      );
    },
  },
  // Remain it first. Maybe in the future AITrace need it.
  // {
  //   accessorKey: "process",
  //   header: () => (
  //     <div className="w-full flex justify-center">
  //       <span className="font-semibold">Process</span>
  //     </div>
  //   ),
  //   cell: ({ row }) => {
  //     const tracks = row.original.tracks;
  //     return (
  //       <div className="flex gap-2 justify-center">
  //         <ScrollArea className="h-20 w-58 rounded-md p-4">
  //             {tracks.map((track, index) => {
  //               return (
  //                 <div key={index} className="flex flex-col items-center">
  //                   <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words text-left">
  //                     <code>{track.step.name}</code>
  //                   </pre>
  //                   {index < tracks.length - 1 && (
  //                     <span className="text-center text-gray-400">↓</span>
  //                   )}
  //                 </div>
  //               );
  //             })}
  //           <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words text-left">
  //             <code></code>
  //           </pre>
  //         </ScrollArea>
  //       </div>
  //     );
  //   },
  // },
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
    accessorKey: "lastUpdateTimestamp",
    header: () => (
      <div className="w-full flex justify-center">
        <span className="font-semibold">{i18n.t("track.columns.lastUpdate")}</span>
      </div>
    ),
    cell: ({ row }) => {
      const endTime = row.original.lastUpdateTimestamp;
      // sv-SE locale produces ISO format; replace "T" with " " to keep YYYY-MM-DD HH:mm:ss
      const formatted = endTime ? new Date(endTime).toLocaleString("sv-SE").replace("T", " ") : "";
      return <div className="text-center font-medium">{formatted}</div>;
    },
  },
];
