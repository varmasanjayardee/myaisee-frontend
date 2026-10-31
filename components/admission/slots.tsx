"use client";

import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarPlusIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/use-today";
import { cn } from "@/lib/utils";
import type { Slot } from "@/schemas/admission.schema";
import { useDeleteSlot, useOptions, useSaveSlot, useSlots, type SlotInput } from "@/services/admission.service";
import { inputClass, SideDrawer } from "./side-drawer";
import { CARD, EmptyState, PageHeader, Select } from "./ui";

/** Campus visit times for the next three weeks; families book these in step 3 */
export function Slots() {
  const today = useToday();
  if (!today) return <Loader2Icon className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" aria-label="Loading" />;
  return <SlotsFrom today={today} />;
}

function SlotsFrom({ today }: { today: string }) {
  const options = useOptions();
  const [campus, setCampus] = useState("");
  const slots = useSlots({ campus, date_from: today, date_to: format(addDays(parseISO(today), 21), "yyyy-MM-dd") });
  const remove = useDeleteSlot();
  const [editing, setEditing] = useState<Slot | "new" | null>(null);

  const byDay = new Map<string, Slot[]>();
  for (const s of slots.data ?? []) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  const stageLabel = (v: string) => options.data?.stages.find((s) => s.value === v)?.label ?? "Every stage";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Visit slots"
        subtitle="Next three weeks. Places count families, so siblings share one."
        actions={
          <>
          <Select
            label="Campus"
            value={campus}
            onChange={setCampus}
            options={[{ value: "", label: "All" }, ...(options.data?.campuses.map((c) => ({ value: String(c.id), label: c.name.trim() })) ?? [])]}
          />
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            New slot
          </Button>
          </>
        }
      />

      {slots.isLoading ? (
        <Loader2Icon className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : !byDay.size ? (
        <div className={CARD}>
          <EmptyState icon={CalendarPlusIcon} title="No slots open">
            Families at the booking step have nothing to choose from. Add a slot to open the calendar.
          </EmptyState>
        </div>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-2 font-semibold">{format(parseISO(day), "EEEE d MMMM")}</h2>
            <ul className={cn(CARD, "divide-y")}>
              {list.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <span className="w-14 text-lg font-semibold tabular-nums">{s.start_time.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.visit_type_label}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[s.campus_name.trim(), s.gate, stageLabel(s.stage), `${s.duration_minutes} min`, s.staff_names.join(", ")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={cn("text-sm tabular-nums", s.places_left === 0 ? "font-semibold text-red-600" : "text-muted-foreground")}>
                    {s.families_booked}/{s.capacity} booked
                  </span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${s.start_time.slice(0, 5)} slot`} onClick={() => setEditing(s)}>
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${s.start_time.slice(0, 5)} slot`}
                      disabled={remove.isPending || s.families_booked > 0}
                      title={s.families_booked > 0 ? "Families are booked; move them first" : undefined}
                      onClick={() => remove.mutate(s.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <SideDrawer open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing === "new" ? "New visit slot" : "Edit visit slot"}>
        {editing && <SlotForm key={editing === "new" ? "new" : editing.id} slot={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </SideDrawer>
    </div>
  );
}

function SlotForm({ slot, onDone }: { slot: Slot | null; onDone: () => void }) {
  const options = useOptions();
  const save = useSaveSlot();
  const [staffQuery, setStaffQuery] = useState("");
  const [form, setForm] = useState<SlotInput>({
    campus: slot?.campus ?? 0,
    date: slot?.date ?? "",
    start_time: slot?.start_time.slice(0, 5) ?? "10:00",
    duration_minutes: slot?.duration_minutes ?? 45,
    visit_type: slot?.visit_type ?? "counsellor",
    capacity: slot?.capacity ?? 4,
    stage: slot?.stage ?? "",
    gate: slot?.gate ?? "Gate 1",
    staff: slot?.staff ?? [],
  });

  const staff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    const all = options.data?.staff ?? [];
    // Picked people stay listed even when filtered out
    return all.filter((p) => form.staff.includes(p.id) || !q || p.name.toLowerCase().includes(q)).slice(0, 40);
  }, [options.data, staffQuery, form.staff]);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ ...form, id: slot?.id }, { onSuccess: onDone });
      }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Campus</span>
            <select required className={cn(inputClass, "mt-1.5")} value={form.campus || ""} onChange={(e) => setForm({ ...form, campus: Number(e.target.value) })}>
              <option value="">Choose</option>
              {options.data?.campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.trim()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Visit type</span>
            <select className={cn(inputClass, "mt-1.5")} value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value as SlotInput["visit_type"] })}>
              <option value="counsellor">Admission Counsellor Slot</option>
              <option value="museum">Museum Guide Slot</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Date</span>
            <input type="date" required className={cn(inputClass, "mt-1.5")} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Start time</span>
            <input type="time" required className={cn(inputClass, "mt-1.5")} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Families</span>
            <input type="number" min={1} required className={cn(inputClass, "mt-1.5")} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Minutes</span>
            <input type="number" min={15} step={5} required className={cn(inputClass, "mt-1.5")} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Open to</span>
            <select className={cn(inputClass, "mt-1.5")} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              <option value="">Every stage</option>
              {options.data?.stages.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Gate</span>
            <input required className={cn(inputClass, "mt-1.5")} value={form.gate} onChange={(e) => setForm({ ...form, gate: e.target.value })} />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Who meets the families</legend>
          <input
            type="search"
            placeholder="Search staff"
            aria-label="Search staff"
            className={cn(inputClass, "mt-2")}
            value={staffQuery}
            onChange={(e) => setStaffQuery(e.target.value)}
          />
          <ul className="mt-2 max-h-56 divide-y overflow-y-auto rounded-xl border">
            {staff.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.staff.includes(p.id)}
                    onChange={(e) => setForm({ ...form, staff: e.target.checked ? [...form.staff, p.id] : form.staff.filter((id) => id !== p.id) })}
                  />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.role}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          Save slot
        </Button>
      </footer>
    </form>
  );
}
