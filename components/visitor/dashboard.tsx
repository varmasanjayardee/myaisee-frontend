"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarCheckIcon,
  ClockIcon,
  DoorOpenIcon,
  HourglassIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/admission/ui";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/use-today";
import { cn } from "@/lib/utils";
import type { GateDashboard, Visitor } from "@/schemas/visitor.schema";
import { useGateDashboard } from "@/services/visitor.service";
import { stayLabel, VisitorActions } from "./ui";
import { VisitorDrawer } from "./visitors";

/** The visitor manager's home: today at the gate, what needs them now, and the patterns over the last month */
export function GateHome() {
  const dashboard = useGateDashboard();
  const today = useToday();
  const [editing, setEditing] = useState<Visitor | "new" | null>(null);
  const d = dashboard.data;
  // After an action the dashboard refetches; the drawer follows the fresh copy
  const open =
    editing && editing !== "new" ? ([...(d?.pending ?? []), ...(d?.on_site ?? []), ...(d?.arriving ?? [])].find((v) => v.id === editing.id) ?? editing) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Gate"
        subtitle={today ? format(parseISO(today), "EEEE d MMMM") : " "}
        actions={
          <>
            <Button variant="outline" render={<Link href="/visitor/visitors" />} nativeButton={false}>
              Today&apos;s log
            </Button>
            <Button onClick={() => setEditing("new")}>
              <UserPlusIcon />
              Register visitor
            </Button>
          </>
        }
      />

      {dashboard.isLoading ? (
        <GateSkeleton />
      ) : !d ? (
        <Card>
          <EmptyState icon={AlertTriangleIcon} title="The gate dashboard didn't load">
            {dashboard.error?.message}
          </EmptyState>
        </Card>
      ) : (
        <>
          {d.today.overstay > 0 && (
            <Link
              href="/visitor/visitors?status=checked_in"
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-950/70"
            >
              <AlertTriangleIcon className="size-5 shrink-0" />
              <span className="flex-1">
                <span className="font-semibold">
                  {d.today.overstay} {d.today.overstay === 1 ? "visitor has" : "visitors have"} been on site over {d.overstay_hours} hours.
                </span>{" "}
                Check they&apos;re still with their host, or check them out.
              </span>
              <ArrowRightIcon className="size-4 shrink-0" />
            </Link>
          )}

          <Today d={d} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHead title="Arrivals, last 14 days" hint="Checked-in visitors and admission families" />
              <Trend trend={d.trend} today={today} />
            </Card>
            <Queue
              title="Waiting for approval"
              icon={ShieldCheckIcon}
              rows={d.pending}
              count={d.today.pending}
              href="/visitor/visitors?status=pending&when=all"
              empty="No one is waiting. Walk-ins you register for later land here."
              detail={(v) => `${v.purpose_label}${v.host_name ? ` · ${v.host_name}` : ""}`}
              onOpen={setEditing}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Queue
              className="lg:col-span-2"
              title="On site now"
              icon={DoorOpenIcon}
              rows={d.on_site}
              count={d.today.on_site}
              href="/visitor/visitors?status=checked_in"
              empty="No visitors on campus right now."
              detail={(v) =>
                [v.host_name ? `With ${v.host_name}` : v.purpose_label, v.badge_number && `Badge ${v.badge_number}`, v.minutes_on_site !== null && stayLabel(v.minutes_on_site)]
                  .filter(Boolean)
                  .join(" · ")
              }
              onOpen={setEditing}
            />
            <Queue
              title="Arriving soon"
              icon={ClockIcon}
              rows={d.arriving}
              count={d.today.expected}
              href="/visitor/visitors?status=approved"
              empty="No one else is expected today."
              detail={(v) => `${format(parseISO(v.expected_at), "h:mm a")} · ${v.purpose_label}`}
              onOpen={setEditing}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHead title="Busiest hours" hint="Check-ins over the last 30 days" />
              <Hours hours={d.hours} />
            </Card>
            <Card>
              <CardHead title="Why people come" hint="Last 30 days" />
              <Purposes purposes={d.purposes} />
            </Card>
          </div>
        </>
      )}

      <VisitorDrawer editing={editing} visitor={open} onClose={() => setEditing(null)} />
    </div>
  );
}

function Today({ d }: { d: GateDashboard }) {
  const t = d.today;
  const stats: { label: string; value: string | number; sub: string; icon: LucideIcon; href?: string; tone?: string }[] = [
    { label: "On site", value: t.people_on_site, sub: `${t.on_site} ${t.on_site === 1 ? "visit" : "visits"} in progress`, icon: DoorOpenIcon, href: "/visitor/visitors?status=checked_in", tone: "text-green-700 dark:text-green-300" },
    { label: "Expected", value: t.expected, sub: "approved, not yet in", icon: ClockIcon, href: "/visitor/visitors?status=approved" },
    { label: "Awaiting approval", value: t.pending, sub: "registered today", icon: ShieldCheckIcon, href: "/visitor/visitors?status=pending", tone: t.pending ? "text-amber-700 dark:text-amber-300" : undefined },
    { label: "Checked out", value: t.checked_out, sub: t.turned_away ? `${t.turned_away} turned away or cancelled` : "done for today", icon: UsersIcon, href: "/visitor/visitors?status=checked_out" },
    { label: "Admission families", value: `${t.admissions_arrived}/${t.admissions_arrived + t.admissions_expected}`, sub: "arrived for campus visits", icon: CalendarCheckIcon, href: "/visitor/admissions" },
    { label: "Average stay", value: d.average_minutes === null ? "–" : stayLabel(d.average_minutes), sub: "last 30 days", icon: HourglassIcon },
  ];

  return (
    <Card>
      <h2 className="sr-only">Today</h2>
      <dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0 [&>*]:-mt-px [&>*]:-ml-px">
        {stats.map((s) => {
          const body = (
            <>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <s.icon className="size-4" />
                {s.label}
              </dt>
              <dd className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", s.tone)}>{s.value}</dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">{s.sub}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block p-5 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="p-5">
              {body}
            </div>
          );
        })}
      </dl>
    </Card>
  );
}

function CardHead({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function Queue({
  title,
  icon: Icon,
  rows,
  count,
  href,
  empty,
  detail,
  onOpen,
  className,
}: {
  title: string;
  icon: LucideIcon;
  rows: Visitor[];
  count: number;
  href: string;
  empty: string;
  detail: (v: Visitor) => string;
  onOpen: (v: Visitor) => void;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHead
        title={title}
        action={
          count > rows.length && (
            <Link href={href} className="text-sm font-medium text-brand hover:underline">
              All {count}
            </Link>
          )
        }
      />
      {rows.length ? (
        <ul className="mt-3 flex-1 divide-y border-t">
          {rows.map((v) => (
            <li key={v.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", v.overstay && "bg-red-50/60 dark:bg-red-950/30")}>
              <button type="button" onClick={() => onOpen(v)} className="group flex min-w-0 flex-1 items-center gap-3 text-left outline-none">
                <Avatar name={v.name} />
                <span className="min-w-0">
                  <span className="block truncate font-medium group-hover:text-brand group-focus-visible:underline">
                    {v.name}
                    {v.party_size > 1 && <span className="font-normal text-muted-foreground"> +{v.party_size - 1}</span>}
                  </span>
                  <span className={cn("block truncate text-xs", v.overstay ? "font-medium text-red-600" : "text-muted-foreground")}>{detail(v)}</span>
                </span>
              </button>
              <VisitorActions visitor={v} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
          <Icon className="size-5 shrink-0" />
          {empty}
        </div>
      )}
    </Card>
  );
}

/** Stacked daily bars: visitors in the brand colour, admission families in a lighter tint */
function Trend({ trend, today }: { trend: GateDashboard["trend"]; today: string | null }) {
  const max = Math.max(1, ...trend.map((t) => t.visitors + t.admissions));
  const total = trend.reduce((n, t) => n + t.visitors + t.admissions, 0);
  const lastWeek = trend.slice(7).reduce((n, t) => n + t.visitors + t.admissions, 0);
  const weekBefore = total - lastWeek;

  return (
    <div className="px-5 pt-4 pb-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="text-2xl font-semibold tabular-nums">{lastWeek}</span> <span className="text-muted-foreground">this week</span>
        </p>
        {weekBefore > 0 && (
          <p className="text-muted-foreground">
            {lastWeek >= weekBefore ? "Up" : "Down"} {Math.abs(Math.round(((lastWeek - weekBefore) / weekBefore) * 100))}% on the week before
          </p>
        )}
        <p className="ml-auto flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand" />
            Visitors
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand/35" />
            Admission families
          </span>
        </p>
      </div>
      <figure aria-label={`${total} arrivals over the last 14 days, ${lastWeek} in the last 7`} className="flex h-44 items-end gap-1.5">
        {trend.map((t) => {
          const isToday = t.date === today;
          const label = `${format(parseISO(t.date), "EEE d MMM")}: ${t.visitors} visitors, ${t.admissions} admission families`;
          return (
            <div key={t.date} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={label}>
              <span className="text-[0.65rem] text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100">{t.visitors + t.admissions}</span>
              <div className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-md" style={{ height: `${((t.visitors + t.admissions) / max) * 100}%` }}>
                <span className="bg-brand" style={{ flexGrow: t.visitors }} />
                <span className="bg-brand/35" style={{ flexGrow: t.admissions }} />
              </div>
              {t.visitors + t.admissions === 0 && <span className="h-0.5 w-full max-w-8 rounded bg-muted" />}
              <span className={cn("text-[0.7rem] tabular-nums", isToday ? "font-semibold text-brand" : "text-muted-foreground")}>{format(parseISO(t.date), "d")}</span>
            </div>
          );
        })}
      </figure>
    </div>
  );
}

const hourLabel = (h: number) => format(new Date(2000, 0, 1, h), "ha").toLowerCase();

/** Check-ins by hour; the range trims to the hours the gate is actually busy (7am–7pm at least) */
function Hours({ hours }: { hours: GateDashboard["hours"] }) {
  const busy = hours.filter((h) => h.count);
  const from = Math.min(7, ...busy.map((h) => h.hour));
  const to = Math.max(19, ...busy.map((h) => h.hour));
  const shown = hours.filter((h) => h.hour >= from && h.hour <= to);
  const max = Math.max(1, ...shown.map((h) => h.count));
  const peak = busy.length ? busy.reduce((a, b) => (b.count > a.count ? b : a)) : null;

  if (!peak)
    return (
      <div className="flex items-center gap-3 px-5 py-10 text-sm text-muted-foreground">
        <ClockIcon className="size-5" />
        Peak hours show once visitors start checking in.
      </div>
    );

  return (
    <div className="px-5 pt-4 pb-5">
      <p className="mb-4 text-sm text-muted-foreground">
        Busiest around <span className="font-semibold text-foreground">{hourLabel(peak.hour)}</span>, keep the desk staffed then.
      </p>
      <figure aria-label={`Most check-ins at ${hourLabel(peak.hour)}`} className="flex h-32 items-end gap-1">
        {shown.map((h) => (
          <div key={h.hour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${hourLabel(h.hour)}: ${h.count} check-ins`}>
            <span
              className={cn("w-full rounded-sm", h.hour === peak.hour ? "bg-brand" : "bg-brand/30")}
              style={{ height: h.count ? `${Math.max(4, (h.count / max) * 100)}%` : "2px" }}
            />
            <span className="text-[0.65rem] text-muted-foreground tabular-nums">{h.hour % 3 === 0 ? hourLabel(h.hour) : " "}</span>
          </div>
        ))}
      </figure>
    </div>
  );
}

function Purposes({ purposes }: { purposes: GateDashboard["purposes"] }) {
  const total = purposes.reduce((n, p) => n + p.count, 0);
  if (!total)
    return (
      <div className="flex items-center gap-3 px-5 py-10 text-sm text-muted-foreground">
        <UsersIcon className="size-5" />
        The mix of visits shows once visitors start checking in.
      </div>
    );

  return (
    <ul className="space-y-3 px-5 pt-4 pb-5">
      {purposes.map((p) => (
        <li key={p.value}>
          <Link href={`/visitor/visitors?purpose=${p.value}&when=past`} className="group block outline-none">
            <span className="flex justify-between text-sm">
              <span className="group-hover:text-brand group-focus-visible:underline">{p.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {p.count} · {Math.round((p.count / total) * 100)}%
              </span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(p.count / purposes[0].count) * 100}%` }} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The dashboard's own shape while it loads: the stat band, the chart and the queues */
function GateSkeleton() {
  const pulse = "animate-pulse rounded bg-muted motion-reduce:animate-none";
  return (
    <div aria-busy aria-label="Loading the gate dashboard" className="space-y-6">
      <Card>
        <div className="grid grid-cols-2 divide-x sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-3 p-5">
              <span className={cn(pulse, "block h-3.5 w-24")} />
              <span className={cn(pulse, "block h-8 w-14")} style={{ animationDelay: `${i * 60}ms` }} />
              <span className={cn(pulse, "block h-3 w-28")} />
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <span className={cn(pulse, "block h-4 w-40")} />
          <div className="mt-6 flex h-44 items-end gap-1.5">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className={cn(pulse, "flex-1 rounded-md")} style={{ height: `${25 + ((i * 37) % 60)}%`, animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        </Card>
        <Card className="space-y-4 p-5">
          <span className={cn(pulse, "block h-4 w-36")} />
          {Array.from({ length: 4 }, (_, r) => (
            <div key={r} className="flex items-center gap-3">
              <span className={cn(pulse, "size-9 shrink-0 rounded-full")} />
              <span className={cn(pulse, "block h-3.5 flex-1")} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
