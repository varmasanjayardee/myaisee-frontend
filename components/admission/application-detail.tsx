"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronLeftIcon, ExternalLinkIcon, FileWarningIcon, Loader2Icon, MailIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, stepLabel } from "@/lib/admission";
import { cn } from "@/lib/utils";
import type { ApplicationDetail } from "@/schemas/admission.schema";
import { useApplication, useOptions, useRequestReupload } from "@/services/admission.service";
import { NextAction } from "./application-actions";
import { JourneyRail, OutcomePill } from "./journey-rail";
import { CARD } from "./ui";

type Answers = Record<string, unknown>;

/** The family's answers, grouped as they filled them in (atlas-admission step 1) */
const CHILD_SECTIONS: { title: string; fields: [string, string][] }[] = [
  {
    title: "Child",
    fields: [
      ["preferred_name", "Preferred name"],
      ["date_of_birth", "Date of birth"],
      ["gender", "Gender"],
      ["nationality", "Nationality"],
      ["mother_tongue", "Mother tongue"],
      ["home_languages", "Languages at home"],
    ],
  },
  {
    title: "Previous schooling",
    fields: [
      ["is_attending_school", "Attending a school now"],
      ["current_school", "School"],
      ["school_curriculum", "Curriculum"],
      ["school_class", "Class"],
      ["school_city", "City"],
      ["attending_since", "Since"],
      ["change_reason", "Reason for change"],
    ],
  },
  {
    title: "Health and support",
    fields: [
      ["blood_group", "Blood group"],
      ["allergies", "Allergies"],
      ["medical_conditions", "Medical conditions"],
      ["medication_details", "Medication"],
      ["learning_support_details", "Learning support"],
      ["hearing_sight_needs", "Hearing or sight"],
      ["paediatrician", "Paediatrician"],
    ],
  },
  {
    title: "About the child",
    fields: [
      ["interests", "Interests"],
      ["heard_from", "Heard about us from"],
      ["school_priorities", "What matters to them"],
      ["notes_for_counsellor", "Note for you"],
    ],
  },
  {
    title: "Declarations",
    fields: [
      ["declared_true", "Information is true"],
      ["consent_data", "Data consent"],
      ["consent_photo", "Photo consent"],
      ["signature_name", "Signed by"],
    ],
  },
];

const show = (value: unknown) => {
  if (value === true) return "Yes";
  if (value === false) return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return format(parseISO(value), "d MMM yyyy");
  if (value === null || value === undefined || value === "") return null;
  return String(value).replaceAll("_", " ");
};

export function ApplicationDetailView({ id }: { id: number }) {
  const detail = useApplication(id);

  if (detail.isLoading) return <Loader2Icon className="mx-auto mt-24 size-6 animate-spin text-muted-foreground" aria-label="Loading" />;
  if (!detail.data) {
    return (
      <div className="mx-auto mt-24 max-w-sm text-center">
        <p className="font-medium">This application didn&apos;t load.</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail.error?.message}</p>
        <Button variant="outline" className="mt-4" render={<Link href="/admission/applications" />}>
          Back to applications
        </Button>
      </div>
    );
  }

  const data = detail.data;
  const app = data.application;
  const family = data.family;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/admission/applications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          Applications
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {app.first_name} {app.last_name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {[app.grade, app.academic_year, data.campus, app.reference].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{stepLabel(app.current_step)}</span>
              {app.outcome !== "pending" && <OutcomePill outcome={app.outcome} />}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-medium">
              {family.first_name} {family.last_name}
            </p>
            <a href={`tel:${family.phone_number}`} className="mt-1 flex items-center gap-1.5 text-brand hover:underline sm:justify-end">
              <PhoneIcon className="size-3.5" />
              {family.phone_number}
            </a>
            <a href={`mailto:${family.email}`} className="mt-0.5 flex items-center gap-1.5 text-brand hover:underline sm:justify-end">
              <MailIcon className="size-3.5" />
              {family.email}
            </a>
          </div>
        </div>
      </div>

      <JourneyRail step={app.current_step} outcome={app.outcome} size="lg" />

      <NextAction detail={data} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8">
          {CHILD_SECTIONS.map((section) => (
            <Record key={section.title} title={section.title} answers={app} fields={section.fields} />
          ))}
          <Family family={family} />
          <Documents app={app} />
          <Payments app={app} />
        </div>

        <aside className="space-y-8">
          <Timeline data={data} />
          {app.visit && (
            <Block title="Visit">
              <p className="text-sm">
                {format(parseISO(app.visit.slot.date), "EEE d MMM")} at {app.visit.slot.start_time.slice(0, 5)}
              </p>
              <p className="text-sm text-muted-foreground">
                {app.visit.slot.visit_type_label} · {app.visit.slot.gate}
                {app.visit.slot.staff_names.length > 0 && ` · with ${app.visit.slot.staff_names.join(", ")}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {app.visit.attended_at ? `Checked in ${format(parseISO(app.visit.attended_at), "d MMM, h:mm a")}` : `Pass ${app.visit.gate_pass_code}`}
                {app.visit.rescheduled_count > 0 && ` · rescheduled ${app.visit.rescheduled_count}×`}
              </p>
            </Block>
          )}
          {data.siblings.length > 0 && (
            <Block title="Siblings applying">
              <ul className="space-y-1.5 text-sm">
                {data.siblings.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admission/applications/${s.id}`} className="font-medium text-brand hover:underline">
                      {s.name}
                    </Link>{" "}
                    <span className="text-muted-foreground">· {stepLabel(s.current_step)}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </aside>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Record({ title, answers, fields }: { title: string; answers: Answers; fields: [string, string][] }) {
  const rows = fields.map(([key, label]) => [label, show(answers[key])] as const).filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <Block title={title}>
      <dl className={cn(CARD, "grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2")}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm first-letter:uppercase">{value}</dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}

function Family({ family }: { family: ApplicationDetail["family"] }) {
  const address = [family.address_line1, family.address_line2, family.locality, family.city, family.state, family.pin_code]
    .map(show)
    .filter(Boolean)
    .join(", ");

  return (
    <Block title="Family">
      <div className={cn(CARD, "space-y-3 p-5 text-sm")}>
        {family.guardians.map((g, i) => (
          <p key={i}>
            <span className="font-medium">{show(g.name)}</span>
            <span className="text-muted-foreground">
              {" "}
              · {show(g.relationship)} · {show(g.mobile)} · {show(g.email)}
              {g.occupation ? ` · ${show(g.occupation)}` : ""}
              {g.is_primary ? " · primary contact" : ""}
            </span>
          </p>
        ))}
        {address && (
          <p>
            <span className="text-muted-foreground">Home: </span>
            {address}
            {family.wants_transport === true && <span className="text-muted-foreground"> · wants school transport</span>}
          </p>
        )}
        {family.sibling_at_school === true && (
          <p>
            <span className="text-muted-foreground">Sibling at Ardee: </span>
            {show(family.sibling_name)} ({show(family.sibling_grade)})
          </p>
        )}
        {family.emergency_contacts.length > 0 && (
          <p>
            <span className="text-muted-foreground">Emergency: </span>
            {family.emergency_contacts.map((c) => `${show(c.name)} (${show(c.relationship)}, ${show(c.mobile)})`).join("; ")}
          </p>
        )}
      </div>
    </Block>
  );
}

function Documents({ app }: { app: ApplicationDetail["application"] }) {
  const options = useOptions();
  const label = (kind: string) => options.data?.document_kinds.find((k) => k.value === kind)?.label ?? kind.replaceAll("_", " ");

  return (
    <Block title="Documents">
      {app.documents.length ? (
        <ul className={cn(CARD, "divide-y")}>
          {app.documents.map((d) => (
            <DocumentRow key={d.kind} appId={app.id} doc={d} label={label(d.kind)} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No documents uploaded yet.</p>
      )}
    </Block>
  );
}

function DocumentRow({ appId, doc, label }: { appId: number; doc: ApplicationDetail["application"]["documents"][number]; label: string }) {
  const request = useRequestReupload(appId);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const sentBack = doc.status === "reupload_requested";

  return (
    <li className="px-5 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label}</span>
          <span className={cn("block truncate text-xs", sentBack ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
            {sentBack ? `New copy requested: ${doc.reupload_note}` : `${doc.original_name} · ${format(parseISO(doc.updated_at), "d MMM yyyy")}`}
          </span>
        </span>
        {doc.url && (
          <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            View
            <ExternalLinkIcon className="size-3.5" />
          </a>
        )}
        {!sentBack && !asking && (
          <Button variant="ghost" size="sm" onClick={() => setAsking(true)}>
            <FileWarningIcon />
            Ask for a new copy
          </Button>
        )}
      </div>
      {asking && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            request.mutate({ kind: doc.kind, note }, { onSuccess: () => setAsking(false) });
          }}
        >
          <input
            autoFocus
            required
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's wrong with it? The family sees this."
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 outline-none focus:ring-3 focus:ring-ring/30"
          />
          <Button type="submit" size="sm" disabled={!note.trim() || request.isPending}>
            Send request
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(false)}>
            Cancel
          </Button>
        </form>
      )}
    </li>
  );
}

function Payments({ app }: { app: ApplicationDetail["application"] }) {
  if (!app.payments.length) return null;
  return (
    <Block title="Payments">
      <ul className={cn(CARD, "divide-y text-sm")}>
        {app.payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{p.kind === "registration" ? "Registration fee" : "Admission fee"}</span>
              <span className="block text-xs text-muted-foreground">
                {format(parseISO(p.paid_at ?? p.created_at), "d MMM yyyy, h:mm a")}
                {p.gateway_payment_mode && ` · ${p.gateway_payment_mode}`}
                {p.gateway_transaction_id && ` · ref ${p.gateway_transaction_id}`}
                {p.failure_reason && ` · ${p.failure_reason}`}
              </span>
            </span>
            <span className="tabular-nums">{formatCurrency(p.amount)}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                p.status === "success" ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : p.status === "failed" ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-muted"
              )}
            >
              {p.status}
            </span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function Timeline({ data }: { data: ApplicationDetail }) {
  return (
    <Block title="Timeline">
      <ol className="relative space-y-4 border-l pl-5">
        {data.step_history.map((h) => (
          <li key={h.step} className="relative text-sm">
            <span aria-hidden className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand" />
            <span className="block font-medium">{h.label}</span>
            <span className="block text-xs text-muted-foreground">
              {format(parseISO(h.completed_at), "d MMM yyyy, h:mm a")}
              {h.by && ` · ${h.by}`}
            </span>
          </li>
        ))}
        {!data.step_history.length && <li className="text-sm text-muted-foreground">Nothing completed yet.</li>}
      </ol>
    </Block>
  );
}
