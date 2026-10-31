"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertCircleIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileWarningIcon,
  HourglassIcon,
  KeyRoundIcon,
  Loader2Icon,
  MapPinnedIcon,
  MoonIcon,
  PhoneIcon,
  ReceiptIndianRupeeIcon,
  ScaleIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHour } from "@/hooks/use-today";
import { PHASES, STEPS } from "@/lib/admission";
import { cn } from "@/lib/utils";
import type { Dashboard, QueueAction } from "@/schemas/admission.schema";
import { Avatar, CARD } from "./ui";
import { useDesk } from "@/services/admission.service";

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/** The counsellor's home: who is where, and what needs doing, most pressing first */
export function AdmissionDesk() {
  const desk = useDesk();
  const hour = useHour();

  if (desk.isLoading) return <Loader2Icon className="mx-auto mt-24 size-6 animate-spin text-muted-foreground" aria-label="Loading" />;
  if (!desk.data) {
    return (
      <div className="mx-auto mt-24 max-w-sm text-center">
        <p className="font-medium">The admissions desk didn&apos;t load.</p>
        <p className="mt-1 text-sm text-muted-foreground">{desk.error?.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => desk.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { actions } = desk.data;
  const yours = actions.filter((a) => a.owner === "you" && a.count);
  const families = actions.filter((a) => a.owner === "family" && a.count);
  const clear = actions.filter((a) => !a.count);
  const yourTotal = yours.reduce((n, a) => n + a.count, 0);
  const familyTotal = families.reduce((n, a) => n + a.count, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">{format(parseISO(desk.data.today), "EEEE d MMMM")}</p>
        <h1 className="mt-1 text-4xl font-bold text-foreground ">{hour === null ? "Admissions desk" : greeting(hour)}</h1>
        <p className="mt-2 text-muted-foreground">
          {yourTotal ? `${yourTotal} need${yourTotal === 1 ? "s" : ""} you` : "Nothing needs you right now"}
          {familyTotal > 0 && `, ${familyTotal} waiting on families`}
          {desk.data.new_enquiries_7d > 0 && `, ${desk.data.new_enquiries_7d} new enquir${desk.data.new_enquiries_7d === 1 ? "y" : "ies"} this week`}.
        </p>
      </header>

      <Pipeline data={desk.data} />

      {yours.length > 0 && (
        <section aria-labelledby="yours" className="space-y-4">
          <SectionTitle id="yours" icon={ZapIcon} title="Your move" count={yourTotal} />
          {yours.map((action) => (
            <ActionBlock key={action.key} action={action} />
          ))}
        </section>
      )}

      {families.length > 0 && (
        <section aria-labelledby="families" className="space-y-4">
          <SectionTitle id="families" icon={UsersIcon} title="Waiting on families" count={familyTotal} />
          {families.map((action) => (
            <ActionBlock key={action.key} action={action} />
          ))}
        </section>
      )}

      {clear.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-300" />
          All clear: {clear.map((a) => a.title.toLowerCase()).join(", ")}.
        </p>
      )}
    </div>
  );
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  visits_today: MapPinnedIcon,
  decide: ScaleIcon,
  joining_date: CalendarCheckIcon,
  accounts: KeyRoundIcon,
  school_items: ClipboardListIcon,
  fee_plans: ReceiptIndianRupeeIcon,
  slots: CalendarPlusIcon,
  offers: HourglassIcon,
  payments: CreditCardIcon,
  reuploads: FileWarningIcon,
  stalled: MoonIcon,
};

function SectionTitle({ id, icon: Icon, title, count }: { id: string; icon: LucideIcon; title: string; count: number }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
      <Icon className="size-5 text-muted-foreground" />
      {title}
      <span className="text-base font-normal text-muted-foreground tabular-nums">{count}</span>
    </h2>
  );
}

/**
 * Families at each step, in the journey's three stretches. Each row opens that step's
 * list; the bar compares it with the busiest step, and "You" marks steps waiting on us.
 */
function Pipeline({ data }: { data: Dashboard }) {
  const count = new Map(data.pipeline.map((p) => [p.step, p.count]));
  const max = Math.max(1, ...data.pipeline.map((p) => p.count));
  const inJourney = data.pipeline.reduce((n, p) => n + p.count, 0);
  const yourSteps = new Set(data.actions.filter((a) => a.owner === "you" && a.count && a.step).map((a) => a.step));

  return (
    <section aria-labelledby="pipeline" className={CARD}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b px-5 py-4 sm:px-6">
        <div>
          <h2 id="pipeline" className="text-lg font-semibold">
            Where families are
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {inJourney} in the journey, {data.enrolled} enrolled, {data.closed} closed
          </p>
        </div>
        <Link href="/admission/applications" className="text-sm font-medium text-brand hover:underline">
          All applications
        </Link>
      </header>

      <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {PHASES.map((phase) => {
          const total = phase.steps.reduce((n, step) => n + (count.get(step) ?? 0), 0);
          return (
            <div key={phase.label} className="p-3 sm:p-4">
              <p className="flex items-baseline justify-between px-2 pb-2 text-sm">
                <span className="font-medium text-muted-foreground">{phase.label}</span>
                <span className="font-semibold tabular-nums">{total}</span>
              </p>
              <ol>
                {phase.steps.map((step) => {
                  const { label, icon: Icon } = STEPS[step - 1];
                  const n = count.get(step) ?? 0;
                  const you = yourSteps.has(step);
                  return (
                    <li key={step}>
                      <Link
                        href={`/admission/applications?step=${step}`}
                        className="group flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                            n ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn("truncate text-sm font-medium", !n && "text-muted-foreground")}>{label}</span>
                            {you && (
                              <span className="rounded-full bg-amber-100 px-1.5 text-[0.7rem] font-semibold text-amber-900 dark:bg-amber-300/15 dark:text-amber-300">
                                You
                              </span>
                            )}
                          </span>
                          <span aria-hidden className="mt-1.5 block h-1 rounded-full bg-muted">
                            <span className="block h-1 rounded-full bg-brand transition-[width]" style={{ width: n ? `${Math.max((n / max) * 100, 6)}%` : 0 }} />
                          </span>
                        </span>
                        <span className={cn("w-8 text-right text-lg font-semibold tabular-nums", !n && "text-muted-foreground/60")}>{n}</span>
                        <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionBlock({ action }: { action: QueueAction }) {
  const more = action.count - action.items.length;
  const seeAll = action.link ? `/admission/${action.link}` : action.step ? `/admission/applications?step=${action.step}` : null;
  const Icon = ACTION_ICONS[action.key] ?? (action.step ? STEPS[action.step - 1].icon : ClipboardListIcon);
  const yours = action.owner === "you";

  return (
    <article className={CARD}>
      <header className="flex items-start gap-4 border-b px-5 py-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", yours ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground")}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{action.title}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{action.count}</span>
            {action.urgent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 tabular-nums dark:bg-red-950 dark:text-red-300">
                <AlertCircleIcon className="size-3" />
                {action.urgent} urgent
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{action.hint}</p>
        </div>
      </header>

      <ul className="divide-y">
        {action.items.map((item) => (
          <li key={`${item.child_id}-${item.detail}`}>
            <Link
              href={`/admission/applications/${item.child_id}`}
              className={cn(
                "group relative flex items-center gap-3 px-5 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted",
                item.urgent && "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-red-500"
              )}
            >
              <Avatar name={item.child} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{item.child}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{item.grade || "No grade yet"}</span>
                  {item.urgent && <span className="shrink-0 rounded-full bg-red-50 px-1.5 text-[0.7rem] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">Urgent</span>}
                </span>
                <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>
              </span>
              <span className="hidden shrink-0 text-right text-sm sm:block">
                <span className="block">{item.parent}</span>
                <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums">
                  <PhoneIcon className="size-3" />
                  {item.phone}
                </span>
              </span>
              <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {more > 0 && seeAll && (
        <Link href={seeAll} className="flex items-center justify-center gap-1 border-t px-5 py-2.5 text-sm font-medium text-brand hover:bg-muted/50">
          See all {action.count}
          <ChevronRightIcon className="size-4" />
        </Link>
      )}
    </article>
  );
}
