"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { AlertTriangleIcon, CalendarX2Icon, CheckIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useToday } from "@/hooks/use-today";
import { errorStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { VisitRow } from "@/schemas/admission.schema";
import { useCheckIn, useVisits, type VisitFilters } from "@/services/admission.service";
import { DataPagination, DEFAULT_PAGE_SIZE, PAGE_SIZES } from "./data-pagination";
import { Avatar, Card, EmptyState, PageHeader, PillTabs, RefreshBar, Select, SkeletonRows } from "./ui";

const WHEN = ["upcoming", "today", "past", "all"] as const;
const WHEN_LABEL = { upcoming: "Upcoming", today: "Today", past: "Past", all: "All" };
const STATUS = [
  { value: "", label: "Any" },
  { value: "booked", label: "Booked" },
  { value: "attended", label: "Arrived" },
];

/**
 * Every visit, paginated: tabs by when, filters in the URL, check-in for today's families.
 * `gate`: the visitor manager's copy, opening on today, with no links into counsellor pages.
 */
export function VisitsList({ gate = false }: { gate?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = useToday();
  const whenParam = params.get("when");
  const fallback = gate ? "today" : "upcoming";
  const when = (WHEN as readonly string[]).includes(whenParam ?? "") ? (whenParam as VisitFilters["when"]) : fallback;
  const status = params.get("status") ?? "";
  const date = params.get("date") ?? "";
  const page = Number(params.get("page")) || 1;
  const sizeParam = Number(params.get("page_size"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;
  const q = params.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const debounced = useDebounce(query.trim(), 350);

  const visits = useVisits({ when, status, date, q, page, page_size: pageSize });

  // A stale URL past the last page (the list shrank): drop back to page 1
  // The search reaches the URL (and the API) once typing pauses: one request per search, not per key
  useEffect(() => {
    if (debounced === (params.get("q") ?? "")) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set("q", debounced);
    else next.delete("q");
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [debounced, params, pathname, router]);

  const pastEnd = page > 1 && errorStatus(visits.error) === 404;
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

  const counts = visits.data?.counts;
  const filtered = !!(status || date || q);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={gate ? "Admission visits" : "Visits"}
        subtitle={counts ? `${counts.today} today · ${counts.upcoming} upcoming · ${counts.past} past` : "Families coming to campus"}
      />

      <PillTabs
        id="visit-tab"
        label="When"
        value={when ?? fallback}
        onChange={(value) => setParams({ when: value === fallback ? "" : value })}
        tabs={WHEN.map((w) => ({ value: w, label: WHEN_LABEL[w], count: counts?.[w] }))}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">Search visits</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search child, parent, phone or gate pass"
              className="h-9 w-full rounded-lg border bg-background pr-8 pl-9 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </label>
          <label className="relative inline-flex">
            <span className="sr-only">On date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setParams({ date: e.target.value, when: e.target.value ? "all" : "" })}
              className={cn(
                "h-9 rounded-lg border bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/30",
                date && "border-brand/40 bg-brand/5 font-medium"
              )}
            />
          </label>
          <Select label="Status" value={status} onChange={(v) => setParams({ status: v })} options={STATUS} />
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setParams({ q: "", status: "", date: "" });
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
              Clear filters
            </button>
          )}
        </div>

        <RefreshBar active={visits.isFetching && !visits.isLoading} />

        {visits.isLoading ? (
          <SkeletonRows columns={5} />
        ) : visits.isError ? (
          <EmptyState icon={AlertTriangleIcon} title="Visits didn't load">
            {visits.error.message}
          </EmptyState>
        ) : !visits.data?.results.length ? (
          <EmptyState icon={CalendarX2Icon} title={q ? `Nothing matches "${q}"` : `No ${when === "all" ? "" : `${WHEN_LABEL[when ?? fallback].toLowerCase()} `}visits`}>
            {gate ? (
              "Families who book a campus visit show here on the day."
            ) : (
              <>
                <Link href="/admission/slots" className="font-medium text-brand hover:underline">
                  Open visit slots
                </Link>{" "}
                so families can book.
              </>
            )}
          </EmptyState>
        ) : (
          <>
            <VisitTable rows={visits.data.results} today={today} linked={!gate} />
            <DataPagination
              noun="visits"
              page={page}
              pageSize={pageSize}
              count={visits.data.count}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ page_size: size === DEFAULT_PAGE_SIZE ? "" : String(size) })}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function VisitTable({ rows, today, linked }: { rows: VisitRow[]; today: string | null; linked: boolean }) {
  const checkIn = useCheckIn();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-medium">When</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Student</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Parent</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Visit</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Gate pass</th>
            <th scope="col" className="px-5 py-2.5 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((v) => {
            const isToday = v.date === today;
            const pending = checkIn.isPending && checkIn.variables === v.id;
            return (
              <tr key={v.id} className={cn("transition-colors hover:bg-brand/[0.04]", isToday && v.status === "booked" && "bg-brand/[0.03]")}>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={cn("block font-medium", isToday && "text-brand")}>{isToday ? "Today" : format(parseISO(v.date), "EEE d MMM")}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{v.start_time}</span>
                </td>
                <td className="px-3 py-3.5">
                  {linked ? (
                    <Link href={`/admission/applications/${v.child_id}`} className="group flex items-center gap-3 outline-none">
                      <Student v={v} />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-3">
                      <Student v={v} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-3.5">
                  <span className="block truncate">{v.parent}</span>
                  <a href={`tel:${v.phone}`} className="block text-xs text-muted-foreground tabular-nums hover:text-brand">
                    {v.phone}
                  </a>
                </td>
                <td className="px-3 py-3.5">
                  <span className="block">{v.visit_type}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[v.gate, v.staff.join(", ")].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td className="px-3 py-3.5 font-mono text-sm tracking-wider">{v.gate_pass_code}</td>
                <td className="px-5 py-3.5 text-right">
                  {v.status === "attended" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200 ring-inset dark:bg-green-950 dark:text-green-300 dark:ring-green-900">
                      <CheckIcon className="size-3.5" />
                      Arrived{v.attended_at && ` ${format(parseISO(v.attended_at), "h:mm a")}`}
                    </span>
                  ) : isToday ? (
                    <Button size="sm" onClick={() => checkIn.mutate(v.id)} disabled={pending} className="shadow-xs">
                      {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                      Check in
                    </Button>
                  ) : (
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Booked</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Student({ v }: { v: VisitRow }) {
  return (
    <>
      <Avatar name={v.child} />
      <span className="min-w-0">
        <span className="block truncate font-medium group-hover:text-brand group-focus-visible:underline">{v.child}</span>
        <span className="block text-xs text-muted-foreground">{v.grade || "—"}</span>
      </span>
    </>
  );
}
