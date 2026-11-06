"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { UsersRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Visitor } from "@/schemas/visitor.schema";
import { useVisitor, useVisitorAction, useVisitorLog } from "@/services/visitor.service";
import { PersonPhoto, Screen, ScreenSkeleton, TitleBar, TypeTag, primaryButton, secondaryButton } from "./ui";

/** Registered and checked in within a minute: they walked in. Otherwise it was booked ahead. */
const visitKind = (v: Visitor) => (v.checked_in_at && v.created_at && Math.abs(parseISO(v.checked_in_at).getTime() - parseISO(v.created_at).getTime()) > 60_000 ? "Appointment" : v.checked_in_at ? "Walk-In" : "Appointment");

function Row({ v, action }: { v: Visitor; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <Link href={`/visitor/list/${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PersonPhoto name={v.name} src={v.photo_url} />
        <span className="min-w-0">
          <b className="block truncate text-[15px] font-semibold">{v.name}</b>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">{visitKind(v)} <span aria-hidden>·</span> <TypeTag type={v.visitor_type} /></span>
        </span>
      </Link>
      {action}
    </div>
  );
}

const pillButton = "h-9 shrink-0 rounded-full bg-brand px-4 text-xs font-bold tracking-wide text-brand-foreground uppercase transition-colors hover:bg-brand-hover disabled:opacity-50";

/** Today's check-ins and check-outs, with one tap to check out */
export function VisitorList() {
  const [show, setShow] = useState<"checked_in" | "checked_out">("checked_in");
  const log = useVisitorLog({ when: "today", status: show, page_size: 100 });
  const action = useVisitorAction();
  const counts = log.data?.counts;

  const tile = (status: typeof show, label: string) => (
    <button type="button" aria-pressed={show === status} onClick={() => setShow(status)} className={cn("rounded-xl border p-4 text-left", show === status && "border-brand")}>
      <span className="flex items-start justify-between">
        {counts ? <b className="text-3xl font-bold text-brand">{counts[status] ?? 0}</b> : <span className="h-9 w-8 animate-pulse rounded bg-muted" />}
        <UsersRoundIcon className="size-6 text-sky-600" />
      </span>
      <span className="mt-3 block text-sm text-muted-foreground">Today&apos;s</span>
      <b className="font-semibold text-brand">{label}</b>
    </button>
  );

  return (
    <Screen>
      <TitleBar title="Visitor List" back="/visitor" />
      <div className="mb-5 grid grid-cols-2 gap-3">
        {tile("checked_in", "Check-In")}
        {tile("checked_out", "Check-Out")}
      </div>
      {log.isLoading ? <ScreenSkeleton /> : log.error ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{log.error.message}</p>
      ) : (
        <div className="space-y-3">
          {log.data?.results.map((v) => (
            <Row
              key={v.id}
              v={v}
              action={v.status === "checked_in" && (
                <button type="button" disabled={action.isPending} onClick={() => action.mutate({ id: v.id, action: "check-out" })} className={pillButton}>Check out</button>
              )}
            />
          ))}
          {!log.data?.results.length && <p className="py-10 text-center text-sm text-muted-foreground">{show === "checked_in" ? "Nobody is checked in." : "Nobody has checked out yet."}</p>}
        </div>
      )}
    </Screen>
  );
}

/** Today's appointments: approve them, then check them in when they arrive */
export function AppointmentList() {
  const log = useVisitorLog({ when: "today", status: "pending,approved", page_size: 100 });
  const rows = log.data?.results ?? [];
  const action = useVisitorAction();
  const router = useRouter();

  return (
    <Screen>
      <TitleBar title="Appointment" back="/visitor" />
      {log.isLoading ? <ScreenSkeleton /> : log.error ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{log.error.message}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((v) => (
            <Row
              key={v.id}
              v={v}
              action={v.status === "pending"
                ? <button type="button" disabled={action.isPending} onClick={() => action.mutate({ id: v.id, action: "approve" })} className={pillButton}>Approve</button>
                : <button type="button" disabled={action.isPending} onClick={() => action.mutate({ id: v.id, action: "check-in" }, { onSuccess: () => router.push(`/visitor/pass/${v.id}`) })} className={pillButton}>Check in</button>}
            />
          ))}
          {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">No appointments today.</p>}
        </div>
      )}
    </Screen>
  );
}

/** One visitor: who they came to meet, and the next step for their visit */
export function VisitorDetail({ id }: { id: number }) {
  const { data: v, isLoading, error } = useVisitor(id);
  const action = useVisitorAction();
  const router = useRouter();

  if (isLoading) return <Screen><ScreenSkeleton /></Screen>;
  if (!v) return <Screen><p className="m-auto text-sm text-muted-foreground">{error?.message ?? "This visitor didn't load."}</p></Screen>;

  const rows = [
    ["Meeting To", v.host_name || "--"],
    ["Accompanying Guest", String(Math.max(0, v.party_size - 1))],
    ...(v.student_name ? [["Student", v.student_name]] : []),
    ["Remarks", v.decision_note || "--"],
    ["Mobile No", v.phone_number],
    ["Email Id", v.email || "--"],
    ["Visitor Description", v.notes || v.purpose_label],
    ...(v.gate ? [["Gate", v.gate]] : []),
    ["Check-In", v.checked_in_at ? format(parseISO(v.checked_in_at), "dd-MM-yyyy | hh:mm a") : "--"],
    ...(v.checked_out_at ? [["Check-Out", format(parseISO(v.checked_out_at), "dd-MM-yyyy | hh:mm a")]] : []),
  ];
  const run = (next: "approve" | "reject" | "check-in" | "check-out") =>
    action.mutate({ id: v.id, action: next }, { onSuccess: () => (next === "check-in" ? router.push(`/visitor/pass/${v.id}`) : undefined) });

  return (
    <Screen>
      <TitleBar title={v.status === "pending" || v.status === "approved" ? "Appointment" : "Visitor List"} back={v.status === "pending" || v.status === "approved" ? "/visitor/appointments" : "/visitor/list"} />
      <div className="mb-4 flex items-center gap-4 border-b pb-4">
        <PersonPhoto name={v.name} src={v.photo_url} size={52} />
        <span>
          <b className="block text-lg font-semibold">{v.name}</b>
          <TypeTag type={v.visitor_type} />
        </span>
      </div>
      <dl className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-brand">{value}</dd>
          </div>
        ))}
      </dl>
      {v.id_document_url && (
        <a href={v.id_document_url} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm font-medium text-brand underline">
          ID proof: {v.id_document_name || "Open"}
        </a>
      )}
      <div className="mt-auto space-y-3 pt-6">
        {v.status === "checked_in" && <button type="button" disabled={action.isPending} onClick={() => run("check-out")} className={primaryButton}>Check-Out</button>}
        {v.status === "approved" && <button type="button" disabled={action.isPending} onClick={() => run("check-in")} className={primaryButton}>Check-In</button>}
        {v.status === "pending" && (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={action.isPending} onClick={() => run("reject")} className={secondaryButton}>Reject</button>
            <button type="button" disabled={action.isPending} onClick={() => run("approve")} className={primaryButton}>Approve</button>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">Powered by myAtlas</p>
      </div>
    </Screen>
  );
}
