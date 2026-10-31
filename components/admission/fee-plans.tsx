"use client";

import { useState } from "react";
import { IndianRupeeIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/admission";
import { cn } from "@/lib/utils";
import type { FeeItem, FeePlan } from "@/schemas/admission.schema";
import { useDeleteFeePlan, useFeePlans, useOptions, useSaveFeePlan, type FeePlanInput } from "@/services/admission.service";
import { inputClass, SideDrawer } from "./side-drawer";
import { CARD, EmptyState, PageHeader } from "./ui";

// When a fee is paid follows from its type (backend AdmissionFeeItem.PAYABLE_AT)
const AT_REGISTRATION = ["registration"];
const AT_ACCEPTING = ["admission", "caution_deposit"];
const PER_YEAR = { one_time: 1, annual: 1, term: 0, monthly: 12 } as Record<string, number>;

function totals(plan: Pick<FeePlan, "items" | "terms_per_year">) {
  const required = plan.items.filter((i) => !i.is_optional);
  const sum = (items: typeof required) =>
    items.reduce((n, i) => n + Number(i.amount) * (i.frequency === "term" ? plan.terms_per_year : (PER_YEAR[i.frequency] ?? 1)), 0);
  return {
    registration: sum(required.filter((i) => AT_REGISTRATION.includes(i.fee_type))),
    accepting: sum(required.filter((i) => AT_ACCEPTING.includes(i.fee_type))),
    yearly: sum(required.filter((i) => ![...AT_REGISTRATION, ...AT_ACCEPTING].includes(i.fee_type))),
  };
}

/** What families pay, per campus, academic year and grade (blank grade = every grade) */
export function FeePlans() {
  const plans = useFeePlans();
  const remove = useDeleteFeePlan();
  const [editing, setEditing] = useState<FeePlan | "new" | null>(null);

  const groups = new Map<string, FeePlan[]>();
  for (const p of plans.data ?? []) {
    const key = `${p.campus_name.trim()} · ${p.academic_year}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Fee plans"
        subtitle="A plan with no grade covers every grade; a grade-specific plan wins over it."
        actions={
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            New fee plan
          </Button>
        }
      />

      {plans.isLoading ? (
        <Loader2Icon className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : !groups.size ? (
        <div className={CARD}>
          <EmptyState icon={IndianRupeeIcon} title="No fee plans yet">
            Families can&apos;t pay the registration fee until their campus, year and grade have one.
          </EmptyState>
        </div>
      ) : (
        [...groups.entries()].map(([group, list]) => (
          <section key={group}>
            <h2 className="mb-2 font-semibold">{group}</h2>
            <ul className={cn(CARD, "divide-y")}>
              {list.map((plan) => {
                const t = totals(plan);
                return (
                  <li key={plan.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="font-medium">{plan.grade || "Every grade"}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.items.length} line{plan.items.length === 1 ? "" : "s"} · {plan.terms_per_year} terms a year
                        {plan.notes && ` · ${plan.notes}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <Money label="Registration" value={t.registration} />
                      <Money label="On accepting" value={t.accepting} />
                      <Money label="Per year" value={t.yearly} />
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Edit ${plan.grade || "every grade"} plan`} onClick={() => setEditing(plan)}>
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${plan.grade || "every grade"} plan`}
                          disabled={remove.isPending}
                          onClick={() => window.confirm("Delete this fee plan?") && remove.mutate(plan.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <SideDrawer
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New fee plan" : "Edit fee plan"}
        description="Lines paid at registration and on accepting are charged once; the rest is the school fee after joining."
      >
        {editing && <FeePlanForm key={editing === "new" ? "new" : editing.id} plan={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </SideDrawer>
    </div>
  );
}

function Money({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-right">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className={cn("block font-semibold tabular-nums", !value && "text-muted-foreground")}>{value ? formatCurrency(value) : "—"}</span>
    </span>
  );
}

type Line = Omit<FeeItem, "id" | "payable_at" | "annual_amount">;
const blankLine = (sequence: number): Line => ({ fee_type: "tuition", label: "", amount: "", frequency: "term", is_refundable: false, is_optional: false, sequence });

function FeePlanForm({ plan, onDone }: { plan: FeePlan | null; onDone: () => void }) {
  const options = useOptions();
  const save = useSaveFeePlan();
  const [form, setForm] = useState<FeePlanInput>({
    campus: plan?.campus ?? 0,
    academic_year: plan?.academic_year ?? "",
    grade: plan?.grade ?? "",
    terms_per_year: plan?.terms_per_year ?? 3,
    notes: plan?.notes ?? "",
    items: plan?.items.map(({ fee_type, label, amount, frequency, is_refundable, is_optional, sequence }) => ({
      fee_type,
      label,
      amount,
      frequency,
      is_refundable,
      is_optional,
      sequence,
    })) ?? [
      { ...blankLine(0), fee_type: "registration", frequency: "one_time" },
      { ...blankLine(1), fee_type: "admission", frequency: "one_time" },
      blankLine(2),
    ],
  });
  const setLine = (i: number, patch: Partial<Line>) => setForm((f) => ({ ...f, items: f.items.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const once = (type: string) => [...AT_REGISTRATION, ...AT_ACCEPTING].includes(type);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        // Server problems (e.g. two registration lines) arrive as a toast from the hook
        save.mutate({ ...form, id: plan?.id, items: form.items.map((l, i) => ({ ...l, sequence: i })) }, { onSuccess: onDone });
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
            <span className="font-medium">Academic year</span>
            <input required placeholder="2027-28" className={cn(inputClass, "mt-1.5")} value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Grade</span>
            <select className={cn(inputClass, "mt-1.5")} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option value="">Every grade</option>
              {options.data?.grades.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Terms a year</span>
            <input type="number" min={1} max={4} required className={cn(inputClass, "mt-1.5")} value={form.terms_per_year} onChange={(e) => setForm({ ...form, terms_per_year: Number(e.target.value) })} />
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Lines</legend>
          {form.items.map((line, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border p-3 sm:grid-cols-[1.3fr_1fr_0.8fr_0.9fr_auto]">
              <select aria-label="Fee type" className={inputClass} value={line.fee_type} onChange={(e) => setLine(i, { fee_type: e.target.value, ...(once(e.target.value) && { frequency: "one_time", is_optional: false }) })}>
                {options.data?.fee_types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input aria-label="Label shown to families" placeholder="Label (optional)" className={inputClass} value={line.label} onChange={(e) => setLine(i, { label: e.target.value })} />
              <input aria-label="Amount in rupees" type="number" min={0} step="0.01" required placeholder="₹" className={cn(inputClass, "tabular-nums")} value={line.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
              <select aria-label="How often" className={inputClass} value={line.frequency} disabled={once(line.fee_type)} onChange={(e) => setLine(i, { frequency: e.target.value })}>
                {options.data?.frequencies.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove line" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}>
                <Trash2Icon />
              </Button>
              <div className="col-span-full flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={line.is_refundable} onChange={(e) => setLine(i, { is_refundable: e.target.checked })} />
                  Refundable
                </label>
                {!once(line.fee_type) && (
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={line.is_optional} onChange={(e) => setLine(i, { is_optional: e.target.checked })} />
                    Optional (e.g. transport, meals)
                  </label>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, blankLine(form.items.length)] })}>
            <PlusIcon />
            Add line
          </Button>
        </fieldset>

        <label className="block text-sm">
          <span className="font-medium">Notes</span> <span className="text-muted-foreground">(for staff)</span>
          <input className={cn(inputClass, "mt-1.5")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
      </div>
      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          Save fee plan
        </Button>
      </footer>
    </form>
  );
}
