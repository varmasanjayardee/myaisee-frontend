"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { AlertTriangleIcon, CalendarIcon, ClockIcon, FileWarningIcon, InboxIcon, SearchIcon, XIcon } from "lucide-react";
import { STEPS, stepLabel, TOTAL_STEPS } from "@/lib/admission";
import { errorStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApplicationRow } from "@/schemas/admission.schema";
import { useApplications, useDesk, useOptions } from "@/services/admission.service";
import { JourneyRail, OutcomePill } from "./journey-rail";
import { DataPagination, DEFAULT_PAGE_SIZE, PAGE_SIZES } from "./data-pagination";
import { Avatar, Card, EmptyState, PageHeader, PillTabs, RefreshBar, Select, SkeletonRows } from "./ui";

const STATUS = [
  { value: "active", label: "Active", outcome: "pending,waitlisted,offered" },
  { value: "closed", label: "Closed", outcome: "rejected,not_offered,declined,withdrawn" },
  { value: "all", label: "All", outcome: "" },
];
const SORTS = [
  { value: "", label: "Recent activity" },
  { value: "oldest", label: "Quiet the longest" },
  { value: "created", label: "Newest first" },
  { value: "step", label: "Journey step" },
];

/** Every application: step tabs, a filter toolbar and a table of families */
export function ApplicationList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const step = params.get("step") ?? "";
  const status = params.get("status") ?? "active";
  const campus = params.get("campus") ?? "";
  const ordering = params.get("ordering") ?? "";
  const page = Number(params.get("page")) || 1;
  const sizeParam = Number(params.get("page_size"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;
  const [query, setQuery] = useState(params.get("q") ?? "");
  const q = useDeferredValue(query.trim());

  const desk = useDesk();
  const options = useOptions();
  const outcome = STATUS.find((s) => s.value === status)?.outcome ?? "";
  const list = useApplications({ q, step, outcome, campus, ordering, page, page_size: pageSize });

  // Filters live in the URL, so the desk's links and the back button work
  // A stale URL past the last page (the list shrank): drop back to page 1
  const pastEnd = page > 1 && errorStatus(list.error) === 404;
  useEffect(() => {
    if (!pastEnd) return;
    const next = new URLSearchParams(params);
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [pastEnd, params, pathname, router]);

  const setParams = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    if (!("page" in next)) merged.delete("page");
    router.replace(`${pathname}?${merged}`, { scroll: false });
  };

  const filtered = !!(step || campus || ordering || q || status !== "active");
  const counts = Object.fromEntries((desk.data?.pipeline ?? []).map((p) => [String(p.step), p.count]));
  const activeTotal = (desk.data?.pipeline ?? []).reduce((n, p) => n + p.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Applications"
        subtitle={
          list.data
            ? `${list.data.count} ${list.data.count === 1 ? "family" : "families"}${step ? ` at ${stepLabel(Number(step)).toLowerCase()}` : ""}`
            : "Every family, where they are in the journey"
        }
      />

      <PillTabs
        id="step-tab"
        label="Journey step"
        value={step}
        onChange={(value) => setParams({ step: value })}
        tabs={[{ value: "", label: "All steps", count: activeTotal }, ...STEPS.map((s) => ({ value: String(s.step), label: s.short, count: counts[String(s.step)] }))]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">Search applications</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setParams({ q: e.target.value.trim() });
              }}
              placeholder="Search child, parent, phone, email or reference"
              className="h-9 w-full rounded-lg border bg-background pr-8 pl-9 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setParams({ q: "" });
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </label>
          <Select label="Status" value={status} onChange={(v) => setParams({ status: v === "active" ? "" : v })} options={STATUS} />
          <Select
            label="Campus"
            value={campus}
            onChange={(v) => setParams({ campus: v })}
            options={[{ value: "", label: "All" }, ...(options.data?.campuses.map((c) => ({ value: String(c.id), label: c.name.trim() })) ?? [])]}
          />
          <Select label="Sort" value={ordering} onChange={(v) => setParams({ ordering: v })} options={SORTS} />
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                router.replace(pathname, { scroll: false });
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
              Clear filters
            </button>
          )}
        </div>

        <RefreshBar active={list.isFetching && !list.isLoading} />

        {list.isLoading ? (
          <SkeletonRows />
        ) : list.isError ? (
          <EmptyState icon={AlertTriangleIcon} title="Applications didn't load">
            {list.error.message}
          </EmptyState>
        ) : !list.data?.results.length ? (
          <EmptyState icon={InboxIcon} title={q ? `Nothing matches "${q}"` : "No families here"}>
            {filtered ? "Try another step or clear the filters." : "New applications appear here as families start them."}
          </EmptyState>
        ) : (
          <>
            <ApplicationTable rows={list.data.results} />
            <DataPagination
              noun="families"
              page={page}
              pageSize={pageSize}
              count={list.data.count}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ page_size: size === DEFAULT_PAGE_SIZE ? "" : String(size) })}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function ApplicationTable({ rows }: { rows: ApplicationRow[] }) {
  const router = useRouter();

  return (
    <>
      {/* md and up: a table */}
      <table className="hidden w-full text-sm md:table">
        <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-medium">Student</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Parent</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Grade · campus</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Progress</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-5 py-2.5 text-right font-medium">Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const href = `/admission/applications/${row.id}`;
            return (
              <tr key={row.id} onClick={() => router.push(href)} className="group cursor-pointer transition-colors hover:bg-brand/[0.04]">
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-3">
                    <Avatar name={row.child} />
                    <span className="min-w-0">
                      <Link href={href} onClick={(e) => e.stopPropagation()} className="block truncate font-medium outline-none group-hover:text-brand focus-visible:underline">
                        {row.child}
                      </Link>
                      <span className="block font-mono text-xs text-muted-foreground">{row.reference}</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="block truncate">{row.parent}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{row.phone}</span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="block">{row.grade || "—"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.campus || "No campus yet"}</span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <JourneyRail step={row.current_step} outcome={row.outcome} />
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.min(row.current_step, TOTAL_STEPS)}/{TOTAL_STEPS}</span>
                  </span>
                  <span className="mt-1 block text-xs font-medium">{stepLabel(row.current_step)}</span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <OutcomePill outcome={row.outcome} />
                    <Flags row={row} />
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNowStrict(parseISO(row.last_activity), { addSuffix: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Phones: one card per family */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admission/applications/${row.id}`} className="flex gap-3 px-4 py-4 outline-none hover:bg-muted/50 focus-visible:bg-muted">
              <Avatar name={row.child} />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{row.child}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNowStrict(parseISO(row.last_activity), { addSuffix: true })}</span>
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {row.parent} · {row.grade || "no grade"}
                </span>
                <span className="flex items-center gap-2">
                  <JourneyRail step={row.current_step} outcome={row.outcome} />
                  <span className="text-xs font-medium">{stepLabel(row.current_step)}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {row.outcome !== "pending" && <OutcomePill outcome={row.outcome} />}
                  <Flags row={row} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

const FLAG_STYLE = {
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  brand: "bg-brand/10 text-brand ring-brand/20",
};

function Flags({ row }: { row: ApplicationRow }) {
  const { flags } = row;
  const list = [
    flags.payment_failed && { icon: AlertTriangleIcon, label: "Payment failed", tone: "red" as const },
    flags.reupload_pending && { icon: FileWarningIcon, label: "Document awaited", tone: "amber" as const },
    flags.offer_expires_at && { icon: ClockIcon, label: "Offer ending", tone: "amber" as const },
    flags.visit_date && row.current_step === 4 && { icon: CalendarIcon, label: `Visit ${flags.visit_date}`, tone: "brand" as const },
  ].filter((f) => !!f);

  return list.map(({ icon: Icon, label, tone }) => (
    <span key={label} title={label} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", FLAG_STYLE[tone])}>
      <Icon className="size-3" />
      {label}
    </span>
  ));
}
