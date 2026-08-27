import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableHeader } from "@/components/sortable-header";
import i18n from "@/i18n";
import { formatByteSize } from "@/lib/format";

export type Trace = {
  id: string;
  parentTraceId: string | null;
  name: string;
  tags: string[];
  errorInfo: string | null;
  startTime: string;
  lastUpdateTimestamp: string;
  /** Raw (uncompressed) payload size in bytes; null when the payload object is missing. */
  payloadSize: number | null;
  /** Number of steps belonging to this trace. */
  stepCount: number | null;
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
    header: ({ column }) => <SortableHeader label="ID" column={column} />,
    cell: ({ row }) => {
      return (
        <div className="w-40 truncate justify-center">{row.original.id}</div>
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
    accessorKey: "payloadSize",
    id: "size",
    header: ({ column }) => (
      <SortableHeader
        label={i18n.t("track.columns.size")}
        tooltip={i18n.t("track.columns.sizeHint.trace")}
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
    accessorKey: "stepCount",
    id: "steps",
    header: ({ column }) => (
      <SortableHeader
        label={i18n.t("track.columns.stepCount")}
        tooltip={i18n.t("track.columns.stepCountHint")}
        column={column}
      />
    ),
    cell: ({ row }) => {
      const { stepCount } = row.original;
      return (
        <div className="text-center font-mono text-sm font-medium tabular-nums">
          {stepCount === null ? "—" : stepCount}
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
