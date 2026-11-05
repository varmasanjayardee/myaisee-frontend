"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import { AppearanceMenu } from "@/components/portal/appearance-menu";
import { getInitials } from "@/lib/admission";
import { resolveAccent } from "@/lib/themes";
import { useAppearanceStore } from "@/store/appearance.store";
import { useMe } from "@/services/auth.service";
import { useKeeper, useSetGate } from "@/services/visitor.service";
import { BackButton, Screen, ScreenSkeleton, fieldClass, secondaryButton } from "./ui";

const Initials = ({ name }: { name: string }) => (
  <span className="grid size-28 place-items-center rounded-full border-2 border-brand/20 bg-brand/10 text-3xl font-bold text-brand">{getInitials(name) || "GK"}</span>
);

export function GateProfile() {
  const keeper = useKeeper();
  const me = useMe();
  const name = keeper.data?.name ?? "";
  const accent = resolveAccent("visitor", useAppearanceStore((s) => (me.data ? s.accentByUser[me.data.id] : undefined)));

  return (
    <Screen>
      <BackButton href="/visitor" />
      {keeper.isLoading ? <ScreenSkeleton rows={3} /> : (
        <>
          <div className="my-6 flex flex-col items-center gap-3">
            <Initials name={name} />
            <Link href="/visitor/profile/info" className="flex items-center gap-1 text-xl font-bold">{name}<ChevronRightIcon className="size-5 text-muted-foreground" /></Link>
            <p className="text-sm text-muted-foreground">{keeper.data?.email}</p>
          </div>
          <div className="divide-y rounded-2xl border bg-card">
            <div className="flex items-center gap-3 p-3.5 opacity-60">
              <span className="grid size-10 place-items-center rounded-full bg-brand text-brand-foreground"><ShieldCheckIcon className="size-5" /></span>
              <b className="flex-1 text-sm font-semibold">Sign-In &amp; Security</b>
              <LockIcon className="size-4 text-muted-foreground" aria-label="Not available yet" />
            </div>
            {/* The sidebar's appearance control, on the sidebar's colour so its white label reads */}
            <div className="m-2 rounded-xl bg-sidebar p-1">{me.data && <AppearanceMenu userId={me.data.id} dashboard="visitor" accent={accent} collapsed={false} />}</div>
          </div>
        </>
      )}
    </Screen>
  );
}

export function PersonalInformation() {
  const { data, isLoading } = useKeeper();
  const setGate = useSetGate();
  const [newGate, setNewGate] = useState("");
  if (isLoading || !data) return <Screen><ScreenSkeleton /></Screen>;

  const rows = [
    ["Staff ID", data.work?.employee_id],
    ["Email", data.email],
    ["Designation", data.work?.designation ?? data.role],
    ["School", data.school],
    ["Campus", data.campus?.trim()],
  ];

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <BackButton href="/visitor/profile" />
        <h1 className="text-lg font-semibold">Personal Information</h1>
      </div>
      <div className="my-5 flex flex-col items-center gap-2 text-center">
        <Initials name={data.name} />
        <b className="mt-1 text-2xl font-bold">{data.name}</b>
        <p className="text-sm text-muted-foreground">{[data.gate_name, data.school].filter(Boolean).join(" · ")}</p>
      </div>
      <h2 className="mb-2 font-semibold">Staff Info</h2>
      <dl className="divide-y rounded-2xl border bg-card">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-semibold">{value || "--"}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <dt className="text-muted-foreground">Campus Gate</dt>
          <dd>
            <select aria-label="Campus gate" value={data.gate ?? ""} onChange={(e) => setGate.mutate({ gate: e.target.value ? Number(e.target.value) : null })} className="rounded-lg border bg-background px-2 py-1.5 font-semibold outline-none">
              <option value="">Not set</option>
              {data.gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </dd>
        </div>
      </dl>
      <form
        className="mt-4 grid grid-cols-[1fr_auto] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newGate.trim()) setGate.mutate({ name: newGate.trim() }, { onSuccess: () => setNewGate("") });
        }}
      >
        <input aria-label="New gate name" placeholder="Add a gate, such as Gate 1 - Main Terminal" maxLength={80} className={fieldClass} value={newGate} onChange={(e) => setNewGate(e.target.value)} />
        <button type="submit" disabled={!newGate.trim() || setGate.isPending} className={`${secondaryButton} w-20`}>Add</button>
      </form>
    </Screen>
  );
}
