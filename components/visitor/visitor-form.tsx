"use client";

import { useState } from "react";
import type { AxiosError } from "axios";
import { format, parseISO } from "date-fns";
import { Loader2Icon, LogInIcon } from "lucide-react";
import { toast } from "sonner";
import { inputClass } from "@/components/admission/side-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { visitorInputSchema, type Visitor, type VisitorInput } from "@/schemas/visitor.schema";
import { useSaveVisitor, useUploadVisitorFile, useVisitorOptions } from "@/services/visitor.service";
import { PhotoField } from "./gate/photo-field";
import { VisitorSummary } from "./ui";

/** ISO -> the value a datetime-local input takes, in the browser's time zone */
const toLocalInput = (iso: string) => format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");

const CLOSED = ["checked_out", "rejected", "cancelled"];

/**
 * Register a visitor or edit one, in the one side drawer. A new visitor is either
 * checked straight in (a walk-in at the desk) or registered for later, which waits
 * for approval. An existing one shows their pass and status actions above the form.
 */
export function VisitorForm({ visitor, onDone }: { visitor?: Visitor; onDone: () => void }) {
  const options = useVisitorOptions();
  const save = useSaveVisitor();
  const [form, setForm] = useState<VisitorInput>(() => ({
    name: visitor?.name ?? "",
    phone_number: visitor?.phone_number ?? "",
    email: visitor?.email ?? "",
    company: visitor?.company ?? "",
    purpose: visitor?.purpose ?? "meeting",
    host: visitor?.host ?? null,
    campus: visitor?.campus,
    party_size: visitor?.party_size ?? 1,
    id_type: visitor?.id_type ?? "",
    id_last4: visitor?.id_last4 ?? "",
    vehicle_number: visitor?.vehicle_number ?? "",
    // Opened by a click, never prerendered, so reading the clock here is safe
    expected_at: toLocalInput(visitor?.expected_at ?? new Date().toISOString()),
    badge_number: visitor?.badge_number ?? "",
    notes: visitor?.notes ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkIn, setCheckIn] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const uploadId = useUploadVisitorFile();
  const locked = !!visitor && CLOSED.includes(visitor.status);
  const campuses = options.data?.campuses ?? [];
  const campus = form.campus ?? (campuses.length === 1 ? campuses[0].id : undefined);
  const hosts = options.data?.hosts.filter((h) => !campus || h.campus === campus || h.campus === null) ?? [];

  const set = (patch: Partial<VisitorInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  const submit = async (walkIn: boolean) => {
    const parsed = visitorInputSchema.safeParse({ ...form, campus });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (!visitor && campuses.length > 1 && !campus) {
      setErrors({ campus: "Choose a campus" });
      return;
    }
    setCheckIn(walkIn);
    let idDocument = {};
    try {
      if (photo) idDocument = { photo_key: await uploadId.mutateAsync({ kind: "photo", file: photo }) };
      if (idFile) idDocument = { ...idDocument, id_document_key: await uploadId.mutateAsync({ kind: "id_proof", file: idFile }), id_document_name: idFile.name };
    } catch (error) {
      setErrors({ id_document: (error as Error).message });
      return;
    }
    const values = { ...parsed.data, ...idDocument, expected_at: new Date(parsed.data.expected_at).toISOString(), ...(walkIn && { check_in: true }) };
    save.mutate(
      { id: visitor?.id, values },
      {
        onSuccess: (saved) => {
          toast.success(visitor ? "Visitor updated" : walkIn ? `${saved.name} checked in. Pass ${saved.pass_code}.` : `${saved.name} registered. Waiting for approval.`);
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
      }
    );
  };

  const field = (name: keyof VisitorInput | "id_document", label: string, input: React.ReactNode, optional = false) => (
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
  const invalid = (name: keyof VisitorInput) => ({ "aria-invalid": !!errors[name] });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {visitor && <VisitorSummary visitor={visitor} onDone={onDone} />}

        <fieldset className="space-y-3" disabled={locked}>
          <legend className="mb-3 text-sm font-semibold">Visitor</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("name", "Full name", <input autoFocus={!visitor} className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} {...invalid("name")} />)}
            {field(
              "phone_number",
              "Mobile",
              <input type="tel" placeholder="+91 98100 41122" className={inputClass} value={form.phone_number} onChange={(e) => set({ phone_number: e.target.value })} {...invalid("phone_number")} />
            )}
            {field("company", "Company or school", <input className={inputClass} value={form.company} onChange={(e) => set({ company: e.target.value })} {...invalid("company")} />, true)}
            {field("email", "Email", <input type="email" className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} {...invalid("email")} />, true)}
          </div>
        </fieldset>

        <fieldset className="space-y-3" disabled={locked}>
          <legend className="mb-3 text-sm font-semibold">The visit</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {campuses.length > 1 &&
              field(
                "campus",
                "Campus",
                <select className={inputClass} value={form.campus ?? ""} onChange={(e) => set({ campus: Number(e.target.value) || undefined, host: null })} {...invalid("campus")}>
                  <option value="">Choose</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            {field(
              "purpose",
              "Purpose",
              <select className={inputClass} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} {...invalid("purpose")}>
                {options.data?.purposes.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            {field(
              "host",
              "Meeting",
              <select className={inputClass} value={form.host ?? ""} onChange={(e) => set({ host: Number(e.target.value) || null })} {...invalid("host")}>
                <option value="">No one in particular</option>
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.role && ` · ${h.role}`}
                  </option>
                ))}
              </select>,
              true
            )}
            {field(
              "expected_at",
              "Expected",
              <input type="datetime-local" className={inputClass} value={form.expected_at} onChange={(e) => set({ expected_at: e.target.value })} {...invalid("expected_at")} />
            )}
            {field(
              "party_size",
              "People in the group",
              <input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                className={inputClass}
                value={form.party_size}
                onChange={(e) => set({ party_size: Number(e.target.value) })}
                {...invalid("party_size")}
              />
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-3" disabled={locked}>
          <legend className="mb-1 text-sm font-semibold">At the gate</legend>
          <PhotoField name={form.name || "Visitor"} savedSrc={visitor?.photo_url} onChange={setPhoto} />
          <p className="mb-3 text-sm text-muted-foreground">Keep the last 4 characters of the ID number, and upload a copy if your campus needs one.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field(
              "id_type",
              "ID shown",
              <select className={inputClass} value={form.id_type} onChange={(e) => set({ id_type: e.target.value, ...(!e.target.value && { id_last4: "" }) })} {...invalid("id_type")}>
                <option value="">None</option>
                {options.data?.id_types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>,
              true
            )}
            {field(
              "id_last4",
              "ID, last 4",
              <input
                maxLength={4}
                autoComplete="off"
                className={cn(inputClass, "font-mono tracking-widest uppercase")}
                value={form.id_last4}
                onChange={(e) => set({ id_last4: e.target.value.replace(/[^A-Za-z0-9]/g, "") })}
                {...invalid("id_last4")}
                disabled={!form.id_type}
              />,
              true
            )}
            <div className="sm:col-span-2">
              {field(
                "id_document",
                "Upload ID proof",
                <>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={cn(inputClass, "h-auto py-2")}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file && file.size > 10 * 1024 * 1024) {
                        setErrors((errs) => ({ ...errs, id_document: "The file is larger than 10 MB." }));
                        e.target.value = "";
                        return;
                      }
                      setErrors((errs) => Object.fromEntries(Object.entries(errs).filter(([k]) => k !== "id_document")));
                      setIdFile(file);
                    }}
                  />
                  {visitor?.id_document_url && !idFile && (
                    <a href={visitor.id_document_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs font-medium text-brand underline">
                      {visitor.id_document_name || "Open the saved copy"}
                    </a>
                  )}
                </>,
                true
              )}
            </div>
            {field("vehicle_number", "Vehicle", <input placeholder="DL 3C AB 1234" className={cn(inputClass, "uppercase")} value={form.vehicle_number} onChange={(e) => set({ vehicle_number: e.target.value })} {...invalid("vehicle_number")} />, true)}
            {field("badge_number", "Badge", <input placeholder="V-12" className={inputClass} value={form.badge_number} onChange={(e) => set({ badge_number: e.target.value })} {...invalid("badge_number")} />, true)}
          </div>
          {field(
            "notes",
            "Notes",
            <textarea
              rows={2}
              placeholder="Carrying equipment, needs an escort, parking…"
              className={cn(inputClass, "h-auto py-2")}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              {...invalid("notes")}
            />,
            true
          )}
        </fieldset>
      </div>

      <footer className="flex flex-wrap justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          {locked ? "Close" : "Cancel"}
        </Button>
        {!locked && (
          <Button type="submit" variant={visitor ? "default" : "outline"} disabled={save.isPending || uploadId.isPending}>
            {(save.isPending || uploadId.isPending) && !checkIn && <Loader2Icon className="animate-spin" />}
            {visitor ? "Save changes" : "Register for later"}
          </Button>
        )}
        {!visitor && (
          <Button type="button" onClick={() => submit(true)} disabled={save.isPending || uploadId.isPending}>
            {(save.isPending || uploadId.isPending) && checkIn ? <Loader2Icon className="animate-spin" /> : <LogInIcon />}
            Check in now
          </Button>
        )}
      </footer>
    </form>
  );
}
