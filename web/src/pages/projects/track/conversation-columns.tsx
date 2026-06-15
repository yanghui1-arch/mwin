import type { ConversationSummary } from "@/api/conversation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, List } from "lucide-react"
import i18n from "@/i18n"

const formatDateTime = (value: string) =>
  value ? new Date(value).toLocaleString("sv-SE").replace("T", " ") : "-"

const formatNumber = (value?: number) =>
  typeof value === "number" ? value.toLocaleString() : "-"

const formatCost = (value?: number) =>
  typeof value === "number" ? `$${value.toFixed(6)}` : "-"

const hasConversationError = (conversation: ConversationSummary) =>
  conversation.hasError ?? conversation.error ?? Boolean(conversation.errorInfo)

export type Conversation = ConversationSummary & { id: string; name: string; lastUpdateTimestamp: string }

export const toConversationRow = (conversation: ConversationSummary): Conversation => {
  const id = conversation.id ?? conversation.conversationId ?? ""
  return {
    ...conversation,
    id,
    name: id,
    lastUpdateTimestamp: conversation.lastUpdateTimestamp ?? conversation.lastUpdatedAt ?? "",
  }
}

export const conversationColumns: ColumnDef<Conversation>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span className="inline-flex items-center justify-center gap-1">
          <List className="h-4 w-4" />
          <span className="font-semibold">Conversation ID</span>
          {column.getIsSorted() === "asc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
        </span>
      </Button>
    ),
    cell: ({ row }) => <div className="w-48 truncate font-mono text-xs">{row.original.id}</div>,
  },
  {
    accessorKey: "traceCount",
    header: () => <span className="font-semibold">{i18n.t("conversation.columns.traceCount")}</span>,
    cell: ({ row }) => <div className="font-medium">{formatNumber(row.original.traceCount)}</div>,
  },
  {
    id: "errorStatus",
    header: () => <span className="font-semibold">{i18n.t("conversation.columns.errorStatus")}</span>,
    cell: ({ row }) => (
      <Badge variant={hasConversationError(row.original) ? "destructive" : "secondary"}>
        {hasConversationError(row.original) ? i18n.t("conversation.error") : i18n.t("conversation.normal")}
      </Badge>
    ),
  },
  {
    accessorKey: "totalCost",
    header: () => <span className="font-semibold">{i18n.t("conversation.columns.totalCost")}</span>,
    cell: ({ row }) => <div className="font-medium">{formatCost(row.original.totalCost)}</div>,
  },
  {
    accessorKey: "totalTokens",
    header: () => <span className="font-semibold">{i18n.t("conversation.columns.totalTokens")}</span>,
    cell: ({ row }) => <div className="font-medium">{formatNumber(row.original.totalTokens)}</div>,
  },
  {
    accessorKey: "startTime",
    header: () => <span className="font-semibold">{i18n.t("track.columns.startTime")}</span>,
    cell: ({ row }) => <div className="whitespace-nowrap font-medium">{formatDateTime(row.original.startTime)}</div>,
  },
  {
    accessorKey: "lastUpdateTimestamp",
    header: () => <span className="font-semibold">{i18n.t("track.columns.lastUpdate")}</span>,
    cell: ({ row }) => <div className="whitespace-nowrap font-medium">{formatDateTime(row.original.lastUpdateTimestamp)}</div>,
  },
]
