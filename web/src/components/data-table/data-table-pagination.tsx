import { type Table } from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  isLoading?: boolean
}

export function DataTablePagination<TData>({
  table,
  isLoading = false,
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          t("dataTable.rowsSelected", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })
        )}
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{t("dataTable.rowsPerPage")}</p>
          <Select
            disabled={isLoading}
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            t("dataTable.pageInfo", {
              current: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount(),
            })
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={isLoading || !table.getCanPreviousPage()}
          >
            <span className="sr-only">{t("dataTable.goToFirstPage")}</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={isLoading || !table.getCanPreviousPage()}
          >
            <span className="sr-only">{t("dataTable.goToPreviousPage")}</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={isLoading || !table.getCanNextPage()}
          >
            <span className="sr-only">{t("dataTable.goToNextPage")}</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={isLoading || !table.getCanNextPage()}
          >
            <span className="sr-only">{t("dataTable.goToLastPage")}</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
