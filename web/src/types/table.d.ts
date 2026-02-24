// src/types/table.d.ts
import type { RowData } from "@tanstack/table-core";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    onRefresh?: () => void | Promise<void>;
  }
}
