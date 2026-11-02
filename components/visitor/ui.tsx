"use client";

import { useState } from "react";
import { format, formatDistanceStrict, parseISO } from "date-fns";
import { BanIcon, CheckIcon, Loader2Icon, LogInIcon, LogOutIcon, XIcon } from "lucide-react";
import { inputClass } from "@/components/admission/side-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Visitor, VisitorStatus } from "@/schemas/visitor.schema";
import { useVisitorAction, type VisitorAction } from "@/services/visitor.service";

export const STATUS_LABEL: Record<VisitorStatus, string> = {
  pending: "Awaiting approval",
  approved: "Expected",
  checked_in: "On site",
  checked_out: "Checked out",
  rejected: "Turned away",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<VisitorStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  approved: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
  checked_in: "bg-green-50 text-green-800 ring-green-200 dark:bg-green-950 dark:text-green-300 dark:ring-green-900",
  checked_out: "bg-muted text-muted-foreground ring-transparent",
  rejected: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900",
  cancelled: "bg-muted text-muted-foreground ring-transparent",
};

export function StatusPill({ status, className }: { status: VisitorStatus; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset", STATUS_TONE[status], className)}>
      {status === "checked_in" && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** "45 min", "2 h 10 min" */
export function stayLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/**
 * The next step for a visitor, as buttons: approve or turn away a pending one,
 * check in an expected one, check out one on site. `full` (the drawer) adds a
 * reason for turning away, a badge at check-in, and cancelling.
 */
export function VisitorActions({ visitor, full = false, onDone }: { visitor: Visitor; full?: boolean; onDone?: () => void }) {
  const action = useVisitorAction();
  const [asking, setAsking] = useState<"reject" | "cancel" | "check-in" | null>(null);
  const [text, setText] = useState("");
  const busy = action.isPending && action.variables?.id === visitor.id;

  const run = (name: VisitorAction, extra: { note?: string; badge_number?: string } = {}) =>
    action.mutate({ id: visitor.id, action: name, ...extra }, { onSuccess: () => (setAsking(null), onDone?.()) });
  const spinner = (name: VisitorAction) => busy && action.variables?.action === name;

  if (asking) {
    const isCheckIn = asking === "check-in";
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(asking, isCheckIn ? { badge_number: text.trim() } : { note: text.trim() });
        }}
        className="space-y-2 rounded-xl border bg-muted/40 p-3"
      >
        <label className="block text-sm">
          <span className="font-medium">{isCheckIn ? "Badge handed over" : asking === "reject" ? "Why are they being turned away?" : "Why is it cancelled?"}</span>
          <span className="text-muted-foreground"> (optional)</span>
          <input
            autoFocus
            className={cn(inputClass, "mt-1.5")}
            placeholder={isCheckIn ? "V-12" : asking === "reject" ? "No appointment, host unavailable…" : "Rescheduled by the host…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(null)}>
            Back
          </Button>
          <Button type="submit" size="sm" variant={isCheckIn ? "default" : "destructive"} disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            {isCheckIn ? "Check in" : asking === "reject" ? "Turn away" : "Cancel visit"}
          </Button>
        </div>
      </form>
    );
  }

  const ask = (name: "reject" | "cancel" | "check-in") => {
    setText(name === "check-in" ? visitor.badge_number : "");
    setAsking(name);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", !full && "justify-end")}>
      {visitor.status === "pending" && (
        <>
          <Button size="sm" variant="outline" onClick={() => (full ? ask("reject") : run("reject"))} disabled={busy} aria-label={`Turn away ${visitor.name}`}>
            {spinner("reject") ? <Loader2Icon className="animate-spin" /> : <XIcon />}
            {full && "Turn away"}
          </Button>
          <Button size="sm" variant={full ? "outline" : "default"} onClick={() => run("approve")} disabled={busy}>
            {spinner("approve") ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            Approve
          </Button>
        </>
      )}
      {(visitor.status === "approved" || (full && visitor.status === "pending")) && (
        <Button size="sm" onClick={() => (full ? ask("check-in") : run("check-in"))} disabled={busy}>
          {spinner("check-in") ? <Loader2Icon className="animate-spin" /> : <LogInIcon />}
          {visitor.status === "pending" ? "Approve and check in" : "Check in"}
        </Button>
      )}
      {visitor.status === "checked_in" && (
        <Button size="sm" variant={visitor.overstay ? "destructive" : "default"} onClick={() => run("check-out")} disabled={busy}>
          {spinner("check-out") ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
          Check out
        </Button>
      )}
      {full && visitor.status === "approved" && (
        <Button size="sm" variant="ghost" onClick={() => ask("cancel")} disabled={busy} className="text-muted-foreground">
          <BanIcon />
          Cancel visit
        </Button>
      )}
    </div>
  );
}

/** Top of the drawer for an existing visitor: the pass, where they are, who did what, and the next step */
export function VisitorSummary({ visitor, onDone }: { visitor: Visitor; onDone: () => void }) {
  const at = (iso: string | null) => (iso ? format(parseISO(iso), "d MMM, h:mm a") : null);
  const events = [
    { label: "Registered", at: at(visitor.created_at), by: visitor.created_by },
    { label: "Approved", at: at(visitor.approved_at), by: visitor.approved_by },
    { label: `Checked in${visitor.badge_number ? `, badge ${visitor.badge_number}` : ""}`, at: at(visitor.checked_in_at), by: visitor.checked_in_by },
    { label: "Checked out", at: at(visitor.checked_out_at), by: visitor.checked_out_by },
  ].filter((e) => e.at);

  return (
    <section className="space-y-4 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Gate pass</p>
          <p className="font-mono text-2xl font-semibold tracking-[0.2em]">{visitor.pass_code}</p>
        </div>
        <StatusPill status={visitor.status} />
      </div>

      {visitor.status === "checked_in" && visitor.minutes_on_site !== null && (
        <p className={cn("text-sm", visitor.overstay ? "font-medium text-red-600" : "text-muted-foreground")}>
          On site for {stayLabel(visitor.minutes_on_site)}
          {visitor.overstay && ", past the usual stay"}
        </p>
      )}
      {visitor.decision_note && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium">{visitor.status === "rejected" ? "Turned away: " : "Cancelled: "}</span>
          {visitor.decision_note}
        </p>
      )}

      <ol className="space-y-1.5 border-l pl-4 text-sm">
        {events.map((e) => (
          <li key={e.label} className="relative">
            <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-brand" />
            <span className="font-medium">{e.label}</span>
            <span className="text-muted-foreground">
              {" "}
              {e.at}
              {e.by && ` by ${e.by}`}
            </span>
          </li>
        ))}
        {visitor.checked_in_at && visitor.checked_out_at && (
          <li className="text-muted-foreground">Stayed {formatDistanceStrict(parseISO(visitor.checked_out_at), parseISO(visitor.checked_in_at))}</li>
        )}
      </ol>

      <VisitorActions visitor={visitor} full onDone={onDone} />
    </section>
  );
}
