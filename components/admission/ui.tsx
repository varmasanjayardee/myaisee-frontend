"use client";

import { ChevronDownIcon, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { getInitials } from "@/lib/admission";
import { cn } from "@/lib/utils";

/**
 * The admissions desk's shared surfaces, so every screen has the same rhythm:
 * a page header, cards with one soft shadow, a toolbar of selects, avatars,
 * skeletons and empty states.
 */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** The one card surface (1dp): hairline border plus a soft, accent-tinted shadow; in dark a plain cast shadow, never a glow */
export const CARD =
  "overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_color-mix(in_oklab,var(--brand)_25%,transparent)] dark:shadow-sm";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(CARD, className)} {...props} />;
}

/** Native select, styled to match; keeps keyboard and mobile pickers for free */
export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <label className={cn("relative inline-flex", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 appearance-none rounded-lg border bg-background py-0 pr-8 pl-3 text-sm shadow-xs outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          value && current && value !== options[0]?.value && "border-brand/40 bg-brand/5 font-medium"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}

const AVATAR_TINTS = [
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
];

/** Initials in a tint picked from the name, so the same child keeps the same colour */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const tint = AVATAR_TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", tint, className)}>
      {getInitials(name) || "?"}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Placeholder rows shaped like the table that is loading */
export function SkeletonRows({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div aria-busy aria-label="Loading" className="divide-y">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          <span className="size-9 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          {Array.from({ length: columns }, (_, c) => (
            <span
              key={c}
              className="h-3.5 animate-pulse rounded bg-muted motion-reduce:animate-none"
              style={{ width: `${[22, 16, 14, 18, 10][c % 5]}%`, animationDelay: `${r * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A thin bar across the top of a card while it refreshes in the background */
export function RefreshBar({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="relative h-0.5 overflow-hidden">
      {active && (
        <motion.span
          className="absolute inset-y-0 w-1/3 bg-brand"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 1, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </div>
  );
}

/** Pill tabs with an optional count; the highlight slides to the chosen tab */
export function PillTabs({
  label,
  tabs,
  value,
  onChange,
  id,
}: {
  label: string;
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  /** Distinct per tab bar, so two bars on one page don't share a highlight */
  id: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
              selected ? "text-brand-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {selected && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-brand shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "relative min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                  selected ? "bg-white/25" : tab.count ? "bg-muted text-foreground" : "text-muted-foreground/60"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
