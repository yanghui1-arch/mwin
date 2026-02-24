import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRefresh?: () => void | Promise<void>;
}

/**
 * Auto pagination React table hook
 * 
 * @param columns table columns definition.
 * @param data row data
 * @param onRefresh a refresh function to refresh row data
 */
export function useDataTable<TData extends {id: string}, TValue>({
  columns,
  data,
  onRefresh,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      sorting: [{ id: "name", desc: false }],
    },
    state: {
      sorting,
      rowSelection,
      columnFilters,
    },
    meta: {
      onRefresh,
    }
  });

  return { table };
}


interface ManulPaginationDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationState;
  pageCount: number,
  setPagination: OnChangeFn<PaginationState>;
  onRefresh?: () => void | Promise<void>;
}

export function useManulPaginationDataTable<TData extends {id: string}, TValue>({
  columns,
  data,
  pagination,
  pageCount,
  setPagination,
  onRefresh,
}: ManulPaginationDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    initialState: {
      sorting: [{ id: "name", desc: false }],
    },
    state: {
      sorting,
      rowSelection,
      columnFilters,
      pagination,
    },
    manualPagination: true,
    meta: {
      onRefresh,
    }
  });

  return { table };
}