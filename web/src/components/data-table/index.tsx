import {
  flexRender,
  type RowData,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import {
  TableHead,
  Table,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import React, { useState, type ReactElement } from "react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { RowPanelContent } from "./data-table-row-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

/**
 * DataTable general properties
 * The property controls components of data table
 *
 * @template TData - data type in every row
 * @template TValue - customized columndef
 * @template hasCreateProjectComponent - whether renderer a component of `Create Project` in the data table tool bar. if not provided, default to `false`
 * @template isNavigate - whether start navigate while click the row. default to `false`
 * @template children - components children. Supporting `RowPanelContent`
 */
interface DataTableProps<TData> {
  table: TanstackTable<TData>
  hasCreateProjectComponent?: boolean;
  isNavigate?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function DataTable<TData extends { name: string }>({
  table,
  isNavigate = false,
  isLoading = false,
  children,
}: DataTableProps<TData>) {
  const [clickRow, setClickRow] = useState<TData | null>(null);
  const navigate: NavigateFunction = useNavigate();

  const navigateProject = (
    e: React.MouseEvent,
    isSelectCell: boolean,
    row: Row<TData>
  ) => {
    if (isSelectCell) {
      e.stopPropagation();
      return;
    }
    const name = (row.original as TData)?.name;
    // @ts-expect-error: TData maynot have description.
    const description = (row.original as TData)?.description ?? "";
    navigate(String(name), {
      state: {
        description: description,
      },
    });
  };

  // Define row panel content type to avoid rowPanel raise type error.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RowPanelContentType = RowPanelContent as unknown as React.JSXElementConstructor<any>;

  const rowPanel: ReactElement | null | undefined = Array.isArray(children)
    ? (children as ReactElement[]).find((c) => c.type === RowPanelContentType)
    : (children as ReactElement | null)?.type === RowPanelContentType
    ? (children as ReactElement)
    : null;

  const renderPanel = (
    rowPanel?.props as { children?: (rowData: RowData) => React.ReactNode }
  )?.children;
  const popRowPanel = (
    e: React.MouseEvent,
    isSelectCell: boolean,
    row: Row<TData>
  ) => {
    if (isSelectCell) {
      e.stopPropagation();
      return;
    }
    if (rowPanel) {
      setClickRow(row.original as TData);
    }
  };

  const handleClickRow = (
    e: React.MouseEvent,
    isSelectCell: boolean,
    row: Row<TData>
  ) => {
    if (isNavigate) {
      navigateProject(e, isSelectCell, row);
    } else {
      popRowPanel(e, isSelectCell, row);
    }
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={isLoading}>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-center">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(table.getState().pagination.pageSize, 6) }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {table.getVisibleLeafColumns().map((column, columnIndex) => (
                    <TableCell key={column.id} className="h-16">
                      <Skeleton
                        className={columnIndex === 0 ? "mx-auto size-4" : "mx-auto h-5 w-4/5 max-w-40"}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    /* select and action column skip click */
                    const isSelectCell =
                      cell.column.id === "select" ||
                      cell.column.id === "action";
                    return (
                      <TableCell
                        key={cell.id}
                        className={"text-center cursor-pointer"}
                        onClick={(e) => handleClickRow(e, isSelectCell, row)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} isLoading={isLoading} />
      <Dialog open={!!clickRow} onOpenChange={() => setClickRow(null)}>
        <DialogContent className="w-[50%] sm:max-w-none max-w-[90vw] md:max-w-240 max-h-[calc(100vh-2rem)] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {clickRow?.name as string}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full min-w-0">
            {clickRow && renderPanel?.(clickRow)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

