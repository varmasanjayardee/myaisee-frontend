"use client";

import { useId, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import type { AxiosError } from "axios";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  APPLICATION_SECTIONS,
  formProgress,
  sectionStats,
  sectionValues,
  visibleFields,
  type FormField,
  type FormSection,
  type Option,
  type Values,
} from "@/lib/application-form";
import { zodRule } from "@/lib/form";
import { cn } from "@/lib/utils";
import {
  useOptions,
  useSaveSection,
  useSubmitForFamily,
  useUploadForFamily,
  type FamilyChild,
  type FamilyRecord,
} from "@/services/admission.service";

// The family's step 1 form (atlas-admission application-step.tsx), filled in by the
// counsellor on their behalf: same sections, same rules, saved through staff/leads/<id>/.
// Unlike the family, the counsellor can still correct answers after submit.

const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number");

/**
 * Section list, then one section at a time; submits once every required answer is in.
 * `startAt` opens one section straight away (an edit from the journey) and closes after saving it.
 */
export function ApplicationForm({ family, child, startAt, onDone }: { family: FamilyRecord; child: FamilyChild; startAt?: string; onDone: () => void }) {
  const [open, setOpen] = useState<FormSection | null>(() => APPLICATION_SECTIONS.find((s) => s.id === startAt) ?? null);
  const submit = useSubmitForFamily(family.id, child.id);
  const submitted = child.current_step > 1;
  const progress = formProgress(family, child);

  if (open) {
    const index = APPLICATION_SECTIONS.indexOf(open);
    const next = APPLICATION_SECTIONS[index + 1];
    return (
      <SectionEditor
        key={open.id}
        section={open}
        family={family}
        child={child}
        onBack={() => setOpen(null)}
        onSaved={() => (startAt ? onDone() : setOpen(next ?? null))}
        isLast={!!startAt || !next}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{submitted ? "Submitted. Changes you save here replace the family's answers." : "Fill in what the family tells you; it saves per section."}</span>
          <span className="font-semibold tabular-nums">{progress}%</span>
        </div>
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <ol className="divide-y rounded-xl border">
          {APPLICATION_SECTIONS.map((s) => {
            const stats = sectionStats(s, family, child);
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setOpen(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", stats.complete ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-brand/10 text-brand")}>
                    {stats.complete ? <CircleCheckIcon className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{s.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {stats.complete ? "Complete" : `${stats.missing} required answer${stats.missing === 1 ? "" : "s"} left`}
                      {s.scope === "family" && " · shared by all their children"}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Close
        </Button>
        {!submitted && (
          <Button disabled={progress < 100 || submit.isPending} onClick={() => submit.mutate(undefined, { onSuccess: onDone })}>
            {submit.isPending && <Loader2Icon className="animate-spin" />}
            {progress < 100 ? "Complete the required answers to submit" : "Submit application"}
          </Button>
        )}
      </footer>
    </div>
  );
}

type FormValues = { values: Values; rows: Values[] };

const emptyOf = (field: FormField) => (field.type === "toggle" ? false : field.type === "chips" ? [] : field.options === "campuses" || field.options === "academic_years" ? null : "");

const rulesOf = (field: FormField) =>
  field.type === "tel"
    ? { validate: (v: unknown) => !v || zodRule(phoneSchema)(v) }
    : field.type === "email"
      ? { validate: (v: unknown) => !v || zodRule(z.email("Enter a valid email address"))(v) }
      : undefined;

const answerFields = (section: FormSection) => section.fields.filter((f) => f.type !== "file");

function initialValues(section: FormSection, family: FamilyRecord, child: FamilyChild): FormValues {
  const blank = (): Values => Object.fromEntries(answerFields(section).map((f) => [f.key, emptyOf(f)]));

  if (section.repeat) {
    const rows = (family[section.repeat.key] as Values[]).map((row) => ({ ...blank(), ...row }));
    // Start with the parent who enquired
    if (!rows.length && section.repeat.key === "guardians") {
      rows.push({ ...blank(), name: `${family.first_name} ${family.last_name}`.trim(), mobile: family.phone_number, email: family.email, is_primary: true });
    }
    while (rows.length < section.repeat.min) rows.push(blank());
    return { values: {}, rows };
  }

  const saved = sectionValues(section, family, child);
  return { values: Object.fromEntries(answerFields(section).map((f) => [f.key, saved[f.key] ?? emptyOf(f)])), rows: [] };
}

function SectionEditor({
  section,
  family,
  child,
  onBack,
  onSaved,
  isLast,
}: {
  section: FormSection;
  family: FamilyRecord;
  child: FamilyChild;
  onBack: () => void;
  onSaved: () => void;
  isLast: boolean;
}) {
  const save = useSaveSection(family.id);
  const campuses = useOptions().data?.campuses ?? [];
  const { control, handleSubmit, setError, setValue } = useForm<FormValues>({ defaultValues: initialValues(section, family, child) });
  const rows = useFieldArray({ control, name: "rows" });
  const index = APPLICATION_SECTIONS.indexOf(section);

  // DRF errors: { field: ["msg"] } for answers, { guardians: [{ mobile: ["msg"] }, {}] } for rows
  const showErrors = (error: Error) => {
    const data = (error.cause as AxiosError | undefined)?.response?.data as Record<string, unknown> | undefined;
    let shown = false;
    for (const [key, value] of Object.entries(data ?? {})) {
      if (section.repeat && key === section.repeat.key && Array.isArray(value)) {
        value.forEach((row, i) =>
          Object.entries((row ?? {}) as Record<string, string[]>).forEach(([k, msgs]) => {
            setError(`rows.${i}.${k}`, { message: msgs[0] }, { shouldFocus: !shown });
            shown = true;
          })
        );
      } else if (Array.isArray(value) && typeof value[0] === "string" && section.fields.some((f) => f.key === key)) {
        setError(`values.${key}`, { message: value[0] }, { shouldFocus: !shown });
        shown = true;
      }
    }
    if (!shown) toast.error(error.message);
  };

  const onSubmit = handleSubmit(async ({ values, rows: list }) => {
    try {
      if (section.repeat) await save.mutateAsync({ scope: "family", values: { [section.repeat.key]: list } });
      else if (section.scope === "family") await save.mutateAsync({ scope: "family", values });
      // The API wants null, not "", for an empty date
      else await save.mutateAsync({ scope: "child", childId: child.id, values: { ...values, ...("date_of_birth" in values && { date_of_birth: values.date_of_birth || null }) } });
      onSaved();
    } catch (error) {
      showErrors(error as Error);
    }
  });

  const answers = (prefix: "values" | `rows.${number}`, fields: FormField[], values?: Values) =>
    fields.map((field) =>
      field.type === "file" ? (
        <FileInput key={field.key} field={field} leadId={family.id} child={child} />
      ) : (
        <Controller
          key={field.key}
          control={control}
          name={`${prefix}.${field.key}` as `values.${string}`}
          rules={rulesOf(field)}
          render={({ field: input, fieldState }) => (
            <FieldInput
              field={field}
              value={input.value}
              onChange={(value) => {
                input.onChange(value);
                // A new campus has its own academic years
                if (prefix === "values" && field.key === "campus") setValue("values.academic_year", null);
              }}
              campuses={campuses}
              years={campuses.find((c) => c.id === values?.campus)?.academic_years ?? []}
              error={fieldState.error?.message}
            />
          )}
        />
      )
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div>
          <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-0.5 rounded-md px-1 py-1 text-sm font-medium text-brand hover:underline">
            <ChevronLeftIcon className="size-4" />
            All sections
          </button>
          <h3 className="mt-2 text-lg font-semibold">{section.title}</h3>
          <p className="text-xs text-muted-foreground">
            Section {index + 1} of {APPLICATION_SECTIONS.length}
            {section.scope === "family" && " · shared by all their children"}
          </p>
        </div>

        {section.repeat ? (
          <>
            {rows.fields.map((row, i) => (
              <fieldset key={row.id} className="space-y-5 rounded-xl border p-4">
                <legend className="px-1 text-sm font-semibold">
                  {section.repeat!.one} {i + 1}
                </legend>
                <RepeatRow control={control} index={i} section={section} render={(fields) => answers(`rows.${i}`, fields)} />
                {rows.fields.length > section.repeat!.min && (
                  <button type="button" onClick={() => rows.remove(i)} className="text-sm font-medium text-destructive hover:underline">
                    Remove
                  </button>
                )}
              </fieldset>
            ))}
            {rows.fields.length < 6 && (
              <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => rows.append(Object.fromEntries(answerFields(section).map((f) => [f.key, emptyOf(f)])))}>
                <PlusIcon />
                {section.repeat.add}
              </Button>
            )}
          </>
        ) : (
          <SectionAnswers control={control} section={section} child={child} render={(fields, values) => answers("values", fields, values)} />
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          {isLast ? "Save" : "Save and continue"}
        </Button>
      </footer>
    </form>
  );
}

// Watches only what `when` conditions need, so toggles show and hide their follow-ups
function SectionAnswers({ control, section, child, render }: { control: Control<FormValues>; section: FormSection; child: FamilyChild; render: (fields: FormField[], values: Values) => React.ReactNode }) {
  const values = useWatch({ control, name: "values" });
  const uploaded = Object.fromEntries(child.documents.map((d) => [d.kind, d]));
  return <div className="space-y-5">{render(visibleFields(section, { ...values, ...uploaded }), values)}</div>;
}

function RepeatRow({ control, index, section, render }: { control: Control<FormValues>; index: number; section: FormSection; render: (fields: FormField[]) => React.ReactNode }) {
  const row = useWatch({ control, name: `rows.${index}` });
  return <>{render(visibleFields(section, row ?? {}))}</>;
}

const optionOf = (o: Option) => (typeof o === "string" ? { value: o, label: o } : o);
const control = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-38 aria-invalid:border-destructive";
const pill = "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-38 aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-foreground";

/** One answer, drawn from its config in lib/application-form.ts */
function FieldInput({
  field,
  value,
  onChange,
  campuses,
  years,
  error,
  disabled,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  campuses: { id: number; name: string }[];
  /** The chosen campus's academic years, for options: "academic_years" */
  years: { id: number; name: string }[];
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const byId = field.options === "campuses" || field.options === "academic_years";
  const options =
    field.options === "campuses"
      ? campuses.map((c) => ({ value: String(c.id), label: c.name.trim() }))
      : field.options === "academic_years"
        ? years.map((y) => ({ value: String(y.id), label: y.name }))
        : (field.options ?? []).map(optionOf);
  const label = (
    <>
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </>
  );

  if (field.type === "toggle") {
    return (
      <Field data-invalid={!!error}>
        <div className="flex items-center justify-between gap-4">
          <span>
            <FieldLabel htmlFor={id} className="font-normal">
              {label}
            </FieldLabel>
            {field.help && <FieldDescription>{field.help}</FieldDescription>}
          </span>
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={!!value}
            disabled={disabled}
            onClick={() => onChange(!value)}
            className="relative h-6 w-11 shrink-0 rounded-full bg-muted-foreground/25 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-38 aria-checked:bg-brand"
          >
            <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", !!value && "translate-x-5")} />
          </button>
        </div>
        <FieldError>{error}</FieldError>
      </Field>
    );
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {field.type === "select" ? (
        <select
          id={id}
          className={control}
          aria-invalid={!!error}
          disabled={disabled}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(byId ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        >
          <option value="">Choose</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea id={id} rows={3} className={cn(control, "h-auto py-2")} aria-invalid={!!error} disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "seg" || field.type === "chips" ? (
        <div role="group" aria-label={field.label} className="flex flex-wrap gap-2">
          {options.map((o) => {
            const list = (value as string[] | undefined) ?? [];
            const on = field.type === "seg" ? value === o.value : list.includes(o.value);
            // "None" can't sit alongside anything else
            const toggle = () =>
              onChange(field.type === "seg" ? o.value : on ? list.filter((v) => v !== o.value) : o.value === "None" ? ["None"] : [...list.filter((v) => v !== "None"), o.value]);
            return (
              <button key={o.value} type="button" aria-pressed={on} disabled={disabled} onClick={toggle} className={pill}>
                {o.label}
              </button>
            );
          })}
        </div>
      ) : (
        <Input id={id} type={field.type} className="h-10 rounded-lg" aria-invalid={!!error} disabled={disabled} autoComplete="off" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.help && <FieldDescription>{field.help}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** A document answer: uploads as soon as a file is chosen */
export function FileInput({ field, leadId, child }: { field: Pick<FormField, "key" | "label" | "required" | "help">; leadId: number; child: FamilyChild }) {
  const id = useId();
  const upload = useUploadForFamily(leadId, child.id);
  const document = child.documents.find((d) => d.kind === field.key);
  const sentBack = document?.status === "reupload_requested";

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("The file is larger than 10 MB.");
    upload.mutate({ kind: field.key, file }, { onSuccess: () => toast.success(`${field.label} uploaded`) });
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
          sentBack && "border-destructive bg-destructive/5"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          {upload.isPending ? <Loader2Icon className="size-4 animate-spin" /> : document ? <CircleCheckIcon className="size-4" /> : <CameraIcon className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{document ? document.original_name : "Choose a file or scan"}</span>
          <span className="block text-xs text-muted-foreground">
            {sentBack ? `Asked for a new copy: ${document.reupload_note}` : document ? "Choose another file to replace it" : "PDF, JPG or PNG, up to 10 MB"}
          </span>
        </span>
        {document?.url && (
          <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
            View
          </a>
        )}
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          disabled={upload.isPending}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {field.help && <FieldDescription>{field.help}</FieldDescription>}
    </Field>
  );
}
