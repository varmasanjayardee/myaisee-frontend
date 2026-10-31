"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** 1 … 4 5 [6] 7 8 … 20: first, last, and two either side of the current page */
export function pageWindow(page: number, last: number): (number | "gap")[] {
  const pages = new Set([1, last, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

/**
 * The standard table footer: what's showing, rows per page, and page controls
 * (shadcn Pagination parts, with buttons since paging here is state, not links).
 */
export function DataPagination({
  page,
  pageSize,
  count,
  onPageChange,
  onPageSizeChange,
  noun = "rows",
}: {
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** "families", "visits"… for the summary */
  noun?: string;
}) {
  if (!count) return null;
  const last = Math.max(1, Math.ceil(count / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="tabular-nums">
          Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
          <span className="font-medium text-foreground">{count}</span> {noun}
        </span>
        <label className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger size="sm" aria-label="Rows per page" className="shadow-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {last > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button variant="ghost" size="default" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            </PaginationItem>
            {pageWindow(page, last).map((p, i) =>
              p === "gap" ? (
                <PaginationItem key={`gap-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <Button
                    variant={p === page ? "outline" : "ghost"}
                    size="icon"
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? "page" : undefined}
                    onClick={() => onPageChange(p)}
                    className={p === page ? "border-brand/40 font-semibold text-brand shadow-xs" : "tabular-nums"}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <Button variant="ghost" size="default" disabled={page >= last} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                <span className="hidden sm:inline">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
