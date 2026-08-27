import type { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown, ArrowUp, List, Info } from "lucide-react";

interface SortableHeaderProps<TData> {
  label: string;
  /** Optional help text shown in a tooltip via the info icon next to the label. */
  tooltip?: string;
  column: Column<TData, unknown>;
}

/**
 * Centered, sortable column header shared by the data tables.
 *
 * The fixed `w-4` slots around the label keep every sortable header aligned
 * regardless of label length, and the leading `List` icon is the consistent
 * "this column sorts" affordance used across the app. When a `tooltip` is
 * provided, an info icon appears after the label so users can discover what a
 * technical column (such as payload size) actually measures.
 */
export function SortableHeader<TData>({ label, tooltip, column }: SortableHeaderProps<TData>) {
  const button = (
    <Button
      variant="ghost"
      className="w-full justify-center"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span className="inline-flex items-center justify-center gap-1">
        <span className="w-4 inline-flex justify-end">
          <List className="h-4 w-4" />
        </span>
        <span className="font-semibold">{label}</span>
        {tooltip && (
          <span className="inline-flex items-center text-muted-foreground" aria-hidden="true">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
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

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
