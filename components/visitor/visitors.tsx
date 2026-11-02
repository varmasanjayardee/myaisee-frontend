"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangleIcon, CarIcon, IdCardIcon, SearchIcon, UserPlusIcon, UsersIcon, XIcon } from "lucide-react";
import { DataPagination, DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/components/admission/data-pagination";
import { SideDrawer } from "@/components/admission/side-drawer";
import { Avatar, Card, EmptyState, PageHeader, PillTabs, RefreshBar, Select, SkeletonRows } from "@/components/admission/ui";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { errorStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { VISITOR_STATUSES, type Visitor } from "@/schemas/visitor.schema";
import { useVisitorLog, useVisitorOptions, type VisitorFilters } from "@/services/visitor.service";
import { STATUS_LABEL, StatusPill, stayLabel, VisitorActions } from "./ui";
import { VisitorForm } from "./visitor-form";

const WHEN = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All dates" },
];

/** The visitor log: status tabs with counts, filters in the URL, a debounced search, paginated */
export function VisitorLog() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const options = useVisitorOptions();

  const whenParam = params.get("when") ?? "";
  const when = (WHEN.some((w) => w.value === whenParam) ? whenParam : "today") as NonNullable<VisitorFilters["when"]>;
  const status = params.get("status") ?? "";
  const purpose = params.get("purpose") ?? "";
  const date = params.get("date") ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const sizeParam = Number(params.get("page_size"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;

  const [query, setQuery] = useState(q);
  const debounced = useDebounce(query.trim(), 350);
  const [editing, setEditing] = useState<Visitor | "new" | null>(null);

  const log = useVisitorLog({ when, status, purpose, date, q, page, page_size: pageSize });

  const setParams = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    if (!("page" in next)) merged.delete("page");
    router.replace(`${pathname}?${merged}`, { scroll: false });
  };

  // The search reaches the URL (and the API) once typing pauses, so one request per search, not per key
  useEffect(() => {
    if (debounced === (params.get("q") ?? "")) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set("q", debounced);
    else next.delete("q");
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [debounced, params, pathname, router]);

  // A stale URL past the last page (the list shrank): drop back to page 1
  const pastEnd = page > 1 && errorStatus(log.error) === 404;
  useEffect(() => {
    if (!pastEnd) return;
    const next = new URLSearchParams(params);
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [pastEnd, params, pathname, router]);

  const counts = log.data?.counts;
  const filtered = !!(purpose || date || q);
  // The drawer shows the freshest copy of the visitor after an action refetches the log
  const open = editing === "new" ? undefined : editing ? (log.data?.results.find((v) => v.id === editing.id) ?? editing) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Visitors"
        subtitle={counts ? `${counts.checked_in} on site · ${counts.approved} expected · ${counts.pending} awaiting approval` : "Everyone coming through the gate"}
        actions={
          <Button onClick={() => setEditing("new")}>
            <UserPlusIcon />
            Register visitor
          </Button>
        }
      />

      <PillTabs
        id="visitor-status"
        label="Status"
        value={status}
        onChange={(value) => setParams({ status: value })}
        tabs={[{ value: "", label: "All", count: counts?.all }, ...VISITOR_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], count: counts?.[s] }))]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">Search visitors</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, company, phone, pass, badge or vehicle"
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
          <Select label="When" value={when} onChange={(v) => setParams({ when: v === "today" ? "" : v, date: "" })} options={WHEN} />
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
          <Select
            label="Purpose"
            value={purpose}
            onChange={(v) => setParams({ purpose: v })}
            options={[{ value: "", label: "Any" }, ...(options.data?.purposes ?? [])]}
          />
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setParams({ q: "", purpose: "", date: "" });
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
              Clear filters
            </button>
          )}
        </div>

        <RefreshBar active={log.isFetching && !log.isLoading} />

        {log.isLoading ? (
          <SkeletonRows columns={5} rows={8} />
        ) : log.isError && !pastEnd ? (
          <EmptyState icon={AlertTriangleIcon} title="Visitors didn't load">
            {log.error.message}
          </EmptyState>
        ) : !log.data?.results.length ? (
          <EmptyState icon={IdCardIcon} title={q ? `Nothing matches "${q}"` : status ? `No visitors ${STATUS_LABEL[status as Visitor["status"]].toLowerCase()}` : "No visitors yet"}>
            Register walk-ins at the desk, or add expected visitors ahead of time.
          </EmptyState>
        ) : (
          <>
            <VisitorTable rows={log.data.results} onOpen={setEditing} />
            <DataPagination
              noun="visitors"
              page={page}
              pageSize={pageSize}
              count={log.data.count}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ page_size: size === DEFAULT_PAGE_SIZE ? "" : String(size) })}
            />
          </>
        )}
      </Card>

      <VisitorDrawer editing={editing} visitor={open} onClose={() => setEditing(null)} />
    </div>
  );
}

/** The one drawer for registering and editing; keyed so each visitor opens a fresh form */
export function VisitorDrawer({ editing, visitor, onClose }: { editing: Visitor | "new" | null; visitor?: Visitor; onClose: () => void }) {
  return (
    <SideDrawer
      open={!!editing}
      onOpenChange={(o) => !o && onClose()}
      title={visitor ? visitor.name : "Register a visitor"}
      description={visitor ? [visitor.purpose_label, visitor.company, visitor.host_name && `meeting ${visitor.host_name}`].filter(Boolean).join(" · ") : "Check a walk-in straight in, or register someone expected later."}
    >
      {editing && <VisitorForm key={visitor?.id ?? "new"} visitor={visitor} onDone={onClose} />}
    </SideDrawer>
  );
}

/** When they're due, or how long they've been in */
function timing(v: Visitor) {
  const time = (iso: string) => format(parseISO(iso), "h:mm a");
  if (v.status === "checked_in" && v.checked_in_at) return { main: `In ${time(v.checked_in_at)}`, sub: v.minutes_on_site !== null ? stayLabel(v.minutes_on_site) : "" };
  if (v.status === "checked_out" && v.checked_in_at && v.checked_out_at)
    return { main: `${time(v.checked_in_at)} – ${time(v.checked_out_at)}`, sub: v.minutes_on_site !== null ? stayLabel(v.minutes_on_site) : "" };
  const at = parseISO(v.expected_at);
  return { main: isToday(at) ? time(v.expected_at) : format(at, "EEE d MMM"), sub: isToday(at) ? "Expected today" : time(v.expected_at) };
}

function VisitorTable({ rows, onOpen }: { rows: Visitor[]; onOpen: (v: Visitor) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[60rem] text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-medium">Visitor</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Visit</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Time</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Pass</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-5 py-2.5 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((v) => {
            const t = timing(v);
            return (
              <tr key={v.id} className={cn("transition-colors hover:bg-brand/[0.04]", v.overstay && "bg-red-50/60 dark:bg-red-950/30")}>
                <td className="px-5 py-3.5">
                  <button type="button" onClick={() => onOpen(v)} className="group flex items-center gap-3 text-left outline-none">
                    <Avatar name={v.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:text-brand group-focus-visible:underline">{v.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{v.company || v.phone_number}</span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3.5">
                  <span className="block">{v.purpose_label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {v.host_name ? `Meeting ${v.host_name}` : "No host"}
                    {v.party_size > 1 && (
                      <span className="inline-flex items-center gap-0.5" title={`${v.party_size} people`}>
                        <UsersIcon className="size-3" />
                        {v.party_size}
                      </span>
                    )}
                    {v.vehicle_number && (
                      <span className="inline-flex items-center gap-0.5 font-mono">
                        <CarIcon className="size-3" />
                        {v.vehicle_number}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <span className="block tabular-nums">{t.main}</span>
                  <span className={cn("block text-xs", v.overstay ? "font-medium text-red-600" : "text-muted-foreground")}>
                    {t.sub}
                    {v.overstay && ", overstaying"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="block font-mono tracking-wider">{v.pass_code}</span>
                  {v.badge_number && <span className="block text-xs text-muted-foreground">Badge {v.badge_number}</span>}
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill status={v.status} />
                </td>
                <td className="px-5 py-3.5">
                  <VisitorActions visitor={v} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
