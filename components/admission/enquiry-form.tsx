"use client";

import { useState } from "react";
import type { AxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCreateEnquiry, useOptions, type EnquiryInput } from "@/services/admission.service";
import { inputClass } from "./side-drawer";

/** Lead capture for calls, walk-ins and events: the basics, then the family takes it from there */
export function EnquiryForm({ onDone }: { onDone: () => void }) {
  const options = useOptions();
  const create = useCreateEnquiry();
  const [form, setForm] = useState<EnquiryInput>({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    campus: 0,
    grade: "",
    academic_year: 0,
    channel: "phone",
    message: "",
    send_link: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The campus's own academic years (schools.AcademicYear)
  const years = options.data?.campuses.find((c) => c.id === form.campus)?.academic_years ?? [];
  const set = (patch: Partial<EnquiryInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    // Editing a field clears its error
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(form, {
      onSuccess: (lead) => {
        toast.success(form.send_link ? `Enquiry added. ${lead.parent} has been emailed their link.` : "Enquiry added");
        onDone();
      },
      onError: (error) => {
        const data = (error.cause as AxiosError | undefined)?.response?.data as Record<string, unknown> | undefined;
        const fields = Object.fromEntries(
          Object.entries(data ?? {})
            .filter(([, v]) => Array.isArray(v) && typeof v[0] === "string")
            .map(([k, v]) => [k, (v as string[])[0]])
        );
        setErrors(fields);
        if (!Object.keys(fields).length) toast.error(error.message);
      },
    });
  };

  const field = (name: keyof EnquiryInput, label: string, input: React.ReactNode, optional = false) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {optional && <span className="text-muted-foreground"> (optional)</span>}
      <span className="mt-1.5 block">{input}</span>
      {errors[name] && (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {errors[name]}
        </span>
      )}
    </label>
  );
  const invalid = (name: keyof EnquiryInput) => ({ "aria-invalid": !!errors[name] });

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">Parent</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("first_name", "First name", <input autoFocus className={inputClass} value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} {...invalid("first_name")} />)}
            {field("last_name", "Last name", <input className={inputClass} value={form.last_name} onChange={(e) => set({ last_name: e.target.value })} />, true)}
            {field(
              "phone_number",
              "Mobile",
              <input type="tel" placeholder="+91 98100 41122" className={inputClass} value={form.phone_number} onChange={(e) => set({ phone_number: e.target.value })} {...invalid("phone_number")} />
            )}
            {field("email", "Email", <input type="email" placeholder="parent@example.com" className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} {...invalid("email")} />)}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">Applying for</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {field(
              "campus",
              "Campus",
              <select className={inputClass} value={form.campus || ""} onChange={(e) => set({ campus: Number(e.target.value), academic_year: 0 })} {...invalid("campus")}>
                <option value="">Choose</option>
                {options.data?.campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.trim()}
                  </option>
                ))}
              </select>
            )}
            {field(
              "grade",
              "Grade",
              <select className={inputClass} value={form.grade} onChange={(e) => set({ grade: e.target.value })} {...invalid("grade")}>
                <option value="">Choose</option>
                {options.data?.grades.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.value}
                  </option>
                ))}
              </select>
            )}
            {field(
              "academic_year",
              "Academic year",
              <select className={inputClass} value={form.academic_year || ""} onChange={(e) => set({ academic_year: Number(e.target.value) })} disabled={!form.campus} {...invalid("academic_year")}>
                <option value="">{form.campus && !years.length ? "None open" : "Choose"}</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">How they reached us</legend>
          {field(
            "channel",
            "Channel",
            <select className={cn(inputClass, "sm:w-64")} value={form.channel} onChange={(e) => set({ channel: e.target.value })} {...invalid("channel")}>
              {options.data?.channels.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          {field(
            "message",
            "Notes",
            <textarea
              rows={3}
              placeholder="What they asked about, siblings, best time to call…"
              className={cn(inputClass, "h-auto py-2")}
              value={form.message}
              onChange={(e) => set({ message: e.target.value })}
            />,
            true
          )}
        </fieldset>

        <label className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={form.send_link} onChange={(e) => set({ send_link: e.target.checked })} />
          <span>
            <span className="block font-medium">Email the family their application link</span>
            <span className="block text-muted-foreground">The same welcome email the website sends, so they can sign in and start.</span>
          </span>
        </label>
      </div>

      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2Icon className="animate-spin" />}
          Add enquiry
        </Button>
      </footer>
    </form>
  );
}
