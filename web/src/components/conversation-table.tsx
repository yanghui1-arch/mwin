import { DataTable } from "./data-table"
import type { Conversation } from "@/pages/projects/track/conversation-columns"
import type { Table } from "@tanstack/react-table"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"

interface ConversationTableProps {
  table: Table<Conversation>
  loading?: boolean
  error?: string | null
}

export function ConversationTable({ table, loading = false, error }: ConversationTableProps) {
  const { t } = useTranslation()

  const refresh = () => {
    void table.options.meta?.onRefresh?.()
  }

  return (
    <div className="container mx-auto py-2 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">
            {t("conversation.title", { defaultValue: "Conversations" })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("conversation.description", {
              defaultValue: "Browse conversation rollups for this project.",
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          {t("common.refresh", { defaultValue: "Refresh" })}
        </Button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("conversation.loadError", {
            defaultValue: "Failed to load conversations: {{message}}",
            message: error,
          })}
        </div>
      )}
      {!error && !loading && table.getRowModel().rows.length === 0 && (
        <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t("conversation.empty", { defaultValue: "No conversations yet." })}
        </div>
      )}
      <DataTable table={table} />
    </div>
  )
}
