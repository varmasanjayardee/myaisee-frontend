"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/admission";
import { useKeeper } from "@/services/visitor.service";

// The gate app's shared pieces, as in the Visitor App screens: a phone-width column,
// a round back button, navy buttons (bg-brand: Ocean by default) and light cards.

export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col", className)}>{children}</div>;
}

export function BackButton({ href, onClick }: { href?: string; onClick?: () => void }) {
  const cls = "grid size-10 place-items-center rounded-full border border-sky-300/70 text-brand transition-colors hover:bg-muted";
  return href ? (
    <Link href={href} aria-label="Back" className={cls}>
      <ArrowLeftIcon className="size-5" />
    </Link>
  ) : (
    <button type="button" aria-label="Back" onClick={onClick} className={cls}>
      <ArrowLeftIcon className="size-5" />
    </button>
  );
}

export function TitleBar({ title, back, action }: { title: string; back?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-5 grid grid-cols-[40px_1fr_40px] items-center border-b pb-4">
      {back ? <BackButton href={back} /> : <span />}
      <h1 className="text-center text-lg font-bold text-brand">{title}</h1>
      {action ?? <span />}
    </header>
  );
}

export const primaryButton = "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold tracking-wide text-brand-foreground uppercase shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50";
export const secondaryButton = "flex h-12 w-full items-center justify-center rounded-xl border bg-background text-sm font-semibold uppercase transition-colors hover:bg-muted";
export const fieldClass = "h-12 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus-visible:border-brand disabled:opacity-60";

/** A field with its label set into the top border, as on the visitor forms */
export function Floating({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="relative block">
      <span className="absolute -top-2 left-3 bg-background px-1 text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

const CAMPUS_LOGOS = [
  { match: /goa/i, src: "/visitor/logo-goa.png", label: "The Ardee School, Goa" },
  { match: /nfc|delhi/i, src: "/visitor/logo-new-delhi.png", label: "The Ardee School, New Delhi" },
];

/** The school's logo and name; campuses without a logo here show their name only */
export function SchoolMark() {
  const campus = useKeeper().data?.campus?.trim() ?? "";
  const known = CAMPUS_LOGOS.find((c) => c.match.test(campus));
  return (
    <div className="mb-6 flex flex-col items-center gap-2 text-center">
      {known && <Image src={known.src} alt="" width={180} height={44} />}
      <p className="font-semibold text-brand">{known?.label ?? campus}</p>
    </div>
  );
}

export function PersonPhoto({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed storage link
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {getInitials(name)}
    </span>
  );
}

export const TypeTag = ({ type }: { type: "parent" | "other" }) => (
  <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase", type === "parent" ? "border-indigo-300 text-indigo-600 dark:text-indigo-300" : "border-sky-400 text-sky-600 dark:text-sky-300")}>
    {type === "parent" ? "Parent" : "Other"}
  </span>
);

export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      ))}
    </div>
  );
}
