"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, CalendarPlusIcon, GraduationCapIcon, LockIcon, ScanLineIcon, SearchIcon, UserIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useGateToday, useVisitorLog } from "@/services/visitor.service";
import { PersonPhoto, Screen, TitleBar, TypeTag, primaryButton } from "./ui";

function Tile({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-sky-50 text-brand dark:bg-sky-950">
          <Icon className="size-4" />
        </span>
        <b className="text-xl font-bold text-brand">{value}</b>
      </span>
      <span className="mt-2 block text-xs font-medium text-muted-foreground">{label}</span>
    </>
  );
  const cls = "block rounded-xl border border-sky-100 p-3.5 shadow-sm dark:border-border";
  return href ? <Link href={href} className={cn(cls, "transition-colors hover:bg-muted")}>{body}</Link> : <div className={cn(cls, "opacity-60")}>{body}</div>;
}

/** The gate keeper's home: today's numbers, search, Scan QR and Add visitor */
export function GateToday() {
  const counts = useGateToday();
  const [text, setText] = useState("");
  const q = useDebounce(text.trim(), 300);
  const results = useVisitorLog({ when: "all", q, page_size: 10 }, !!q);
  const today = counts.data;
  const number = (n?: number) => (counts.isLoading ? <span className="inline-block h-6 w-6 animate-pulse rounded bg-muted align-middle" /> : (n ?? 0));

  return (
    <Screen>
      <TitleBar
        title="Today's Visitor"
        action={
          <Link href="/visitor/profile" aria-label="Your profile" className="grid size-10 place-items-center rounded-full border bg-muted text-brand">
            <UserIcon className="size-5" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={CalendarDaysIcon} label="Appointment" value={number(today?.appointment_count)} href="/visitor/appointments" />
        <Tile icon={UsersIcon} label="Visitor List" value={number(today?.visitor_list_count)} href="/visitor/list" />
        {/* No gate pass records yet: shown so the screen matches, locked until they exist */}
        <Tile icon={GraduationCapIcon} label="Student Gate Pass" value={<LockIcon className="size-4" aria-label="Not available yet" />} />
        <Tile icon={UserIcon} label="Teacher Gate Pass" value={<LockIcon className="size-4" aria-label="Not available yet" />} />
      </div>

      <hr className="mx-6 my-6" />

      <label className="relative mb-4 block">
        <span className="sr-only">Search visitors</span>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search..." className="h-11 w-full rounded-lg border bg-background pr-10 pl-4 text-sm outline-none focus-visible:border-brand" />
        <SearchIcon className="absolute top-3 right-3 size-5 text-muted-foreground" />
      </label>

      {q ? (
        <div className="mb-4 divide-y rounded-xl border">
          {results.data?.results.map((v) => (
            <Link key={v.id} href={`/visitor/list/${v.id}`} className="flex items-center gap-3 p-3 hover:bg-muted">
              <PersonPhoto name={v.name} src={v.photo_url} size={36} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm font-semibold">{v.name}</b>
                <span className="text-xs text-muted-foreground">{v.status_label} · {v.phone_number}</span>
              </span>
              <TypeTag type={v.visitor_type} />
            </Link>
          ))}
          {results.isLoading && <div className="h-14 animate-pulse bg-muted" aria-hidden />}
          {results.data && !results.data.results.length && <p className="p-4 text-center text-sm text-muted-foreground">No visitor found.</p>}
        </div>
      ) : null}

      <Link href="/visitor/scan" className={primaryButton}>
        <ScanLineIcon className="size-5" />
        Scan QR
      </Link>
      <div className="my-4 flex items-center justify-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="h-px w-12 bg-border" />OR<span className="h-px w-12 bg-border" />
      </div>
      <Link href="/visitor/add" className="mx-auto flex h-11 items-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover">
        <CalendarPlusIcon className="size-4" />
        Add visitor
      </Link>
    </Screen>
  );
}
