"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, FileTextIcon, Loader2Icon, PencilIcon, PlusIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorStatus } from "@/lib/api";
import { formatCurrency, isClosed, OUTCOMES, STEPS, stepLabel, TOTAL_STEPS } from "@/lib/admission";
import { APPLICATION_SECTIONS, formProgress, sectionStats } from "@/lib/application-form";
import { cn } from "@/lib/utils";
import type { ApplicationDetail } from "@/schemas/admission.schema";
import { useAddChild, useApplication, useFamily, type FamilyChild, type FamilyRecord } from "@/services/admission.service";
import { NextAction } from "./application-actions";
import { ApplicationForm } from "./application-form";
import { FamilyCard, MessageForm, NoteForm } from "./family-card";
import { OutcomePill } from "./journey-rail";
import { SideDrawer, inputClass } from "./side-drawer";
import { Card, EmptyState, PillTabs, SkeletonRows } from "./ui";

type App = ApplicationDetail["application"];
type Editing = { childId: number; section?: string } | { message: "write" | "draft" } | "add-child" | "notes" | null;

/**
 * One family's file: each child's ten steps as a chronology (when, who, what), the step
 * they're on open with its action, and every application answer one click from editing.
 */
export function LeadWorkspace({ id }: { id: number }) {
  const family = useFamily(id);
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  if (family.isLoading) return <SkeletonRows columns={3} />;
  if (family.isError || !family.data)
    return (
      <EmptyState icon={AlertTriangleIcon} title={errorStatus(family.error) === 404 ? "No such enquiry" : "The family didn't load"}>
        <Link href="/admission/leads" className="font-medium text-brand hover:underline">
          Back to enquiries
        </Link>
      </EmptyState>
    );

  const data = family.data;
  const parent = `${data.first_name} ${data.last_name}`.trim();
  const child = data.children.find((c) => c.id === picked) ?? data.children[0];
  const editingChild = editing && typeof editing === "object" && "childId" in editing ? data.children.find((c) => c.id === editing.childId) : undefined;
  const drawer =
    editing === "add-child"
      ? { title: "Add child", description: `Starts a new application for ${parent}.` }
      : editing === "notes"
        ? { title: "Notes", description: `About the ${data.last_name || parent} family. Only staff see these.` }
        : editing && "message" in editing
          ? { title: `Message ${parent}`, description: "Opens WhatsApp or your email with the message ready to send." }
          : { title: editingChild ? `${editingChild.first_name}'s application` : "Application", description: `Editing for ${parent}. They see the same answers in Atlas.` };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <Link href="/admission/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          Enquiries
        </Link>
        <FamilyCard
          family={data}
          child={child}
          onMessage={() => setEditing({ message: "write" })}
          onDraft={() => setEditing({ message: "draft" })}
          onNote={() => setEditing("notes")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {data.children.length > 0 && (
          <PillTabs
            id="lead-child"
            label="Child"
            value={String(child?.id)}
            onChange={(value) => setPicked(Number(value))}
            tabs={data.children.map((c) => ({ value: String(c.id), label: `${c.first_name} ${c.last_name}`.trim() }))}
          />
        )}
        <Button variant="ghost" onClick={() => setEditing("add-child")}>
          <PlusIcon />
          Add child
        </Button>
      </div>

      {!child ? (
        <Card>
          <EmptyState icon={UserPlusIcon} title="No child on this enquiry yet">
            <Button className="mt-2" onClick={() => setEditing("add-child")}>
              <PlusIcon />
              Add child
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ChildJourney key={child.id} child={child} family={data} onEdit={(section) => setEditing({ childId: child.id, section })} />
          <Answers child={child} family={data} onEdit={(section) => setEditing({ childId: child.id, section })} />
        </div>
      )}

      <SideDrawer
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={drawer.title}
        description={drawer.description}
      >
        {editing === "notes" ? (
          <NoteForm family={data} onDone={() => setEditing(null)} />
        ) : editing && typeof editing === "object" && "message" in editing ? (
          <MessageForm family={data} child={child} draftFirst={editing.message === "draft"} onDone={() => setEditing(null)} />
        ) : editing === "add-child" ? (
          <AddChild
            leadId={data.id}
            onDone={(created) => {
              if (created) setPicked(created);
              setEditing(created ? { childId: created } : null);
            }}
          />
        ) : (
          editingChild &&
          editing &&
          "childId" in editing && <ApplicationForm family={data} child={editingChild} startAt={editing.section} onDone={() => setEditing(null)} />
        )}
      </SideDrawer>
    </div>
  );
}

// ---- The chronology ----------------------------------------------------------

function ChildJourney({ child, family, onEdit }: { child: FamilyChild; family: FamilyRecord; onEdit: (section?: string) => void }) {
  const detail = useApplication(child.id);

  if (detail.isLoading) return <Card><SkeletonRows rows={10} columns={2} /></Card>;
  if (detail.isError || !detail.data)
    return (
      <Card>
        <EmptyState icon={AlertTriangleIcon} title="This journey didn't load">
          {detail.error?.message}
        </EmptyState>
      </Card>
    );

  const data = detail.data;
  const app = data.application;
  const closed = isClosed(app.outcome);
  // A closed journey stops on the step where it closed
  const stop = closed ? Math.max(app.current_step - 1, 1) : app.current_step;
  const history = new Map(data.step_history.map((h) => [h.step, h]));

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">
            {app.first_name} {app.last_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[app.grade, app.academic_year_name, data.campus].filter(Boolean).join(", ") || "Grade and campus not chosen yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {app.outcome !== "pending" && <OutcomePill outcome={app.outcome} />}
          <Link href={`/admission/applications/${app.id}`} className="text-sm font-medium text-brand hover:underline">
            Full record
          </Link>
        </div>
      </header>

      <ol aria-label={`${app.first_name}'s journey`} className="px-3 py-4 sm:px-5">
        {STEPS.map(({ step, label }) => {
          const done = step < stop || app.current_step > TOTAL_STEPS;
          const here = step === stop && app.current_step <= TOTAL_STEPS;
          const entry = history.get(step);
          const last = step === TOTAL_STEPS;
          const summary = summarise(step, app, data, family, child);

          return (
            <li key={step} aria-current={here ? "step" : undefined} className="grid grid-cols-[3.5rem_1.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[4.5rem_2rem_minmax(0,1fr)]">
              {/* When: the left gutter reads as the family's timeline */}
              <div className="pt-1 text-right text-xs tabular-nums text-muted-foreground">
                {entry ? (
                  <>
                    <span className="block font-medium text-foreground">{format(parseISO(entry.completed_at), "d MMM")}</span>
                    {format(parseISO(entry.completed_at), "h:mm a")}
                  </>
                ) : here ? (
                  <span className={cn("block font-semibold", closed ? "text-red-600" : "text-brand")}>{closed ? "Closed" : "Now"}</span>
                ) : null}
              </div>

              {/* The spine: filled to where they are */}
              <div className="relative flex justify-center">
                {!last && <span aria-hidden className={cn("absolute top-7 bottom-0 w-[3px] rounded-full", done ? "bg-brand" : "bg-border")} />}
                <span
                  className={cn(
                    "relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:size-8",
                    done && "bg-brand text-brand-foreground",
                    here && !closed && "bg-background text-brand ring-[3px] ring-brand motion-safe:animate-[pulse_1.6s_ease-in-out_1]",
                    here && closed && "bg-red-600 text-white dark:text-black/[0.87]",
                    !done && !here && "border-2 border-dashed border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {done ? <CheckIcon className="size-4" /> : step}
                </span>
              </div>

              <div className={cn("min-w-0", last ? "pb-1" : "pb-6")}>
                {here ? (
                  <div>
                    <StepTitle label={label} summary={summary} by={entry?.by} strong />
                    <div className="mt-3">{step === 1 && !closed ? <FillPrompt child={child} family={family} onEdit={onEdit} /> : <NextAction detail={data} />}</div>
                  </div>
                ) : done ? (
                  <details className="group">
                    <summary className="-mx-2 flex cursor-pointer list-none items-start gap-2 rounded-lg px-2 py-1 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <StepTitle label={label} summary={summary} by={entry?.by} />
                      </span>
                      <ChevronDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 rounded-xl border bg-muted/30 p-4 text-sm">
                      <StepDetail step={step} app={app} data={data} onEdit={onEdit} />
                    </div>
                  </details>
                ) : (
                  <StepTitle label={label} summary={closed ? undefined : summary} muted />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function StepTitle({ label, summary, by, strong, muted }: { label: string; summary?: string; by?: string | null; strong?: boolean; muted?: boolean }) {
  return (
    <div className="pt-0.5">
      <p className={cn("text-sm", strong ? "text-base font-semibold" : "font-medium", muted && "text-muted-foreground")}>{label}</p>
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      {by && <p className="text-xs text-muted-foreground">Done by {by}</p>}
    </div>
  );
}

const paid = (app: App, kind: "registration" | "admission") => app.payments.find((p) => p.kind === kind && p.status === "success");
const day = (iso: string) => format(parseISO(iso), "EEE d MMM");

/** One line per step: what happened there, or what's waiting */
function summarise(step: number, app: App, data: ApplicationDetail, family: FamilyRecord, child: FamilyChild): string | undefined {
  const visit = app.visit;
  switch (step) {
    case 1:
      return app.current_step > 1 ? `Submitted with ${app.documents.length} documents` : `${formProgress(family, child)}% filled in`;
    case 2:
    case 7: {
      const p = paid(app, step === 2 ? "registration" : "admission");
      return p ? `${formatCurrency(p.amount)} by ${p.gateway_payment_mode || "card"}${p.gateway_transaction_id ? `, ref ${p.gateway_transaction_id}` : ""}` : undefined;
    }
    case 3:
      return visit ? `${day(visit.slot.date)} at ${visit.slot.start_time.slice(0, 5)}, ${visit.slot.visit_type_label.toLowerCase()}` : undefined;
    case 4:
      return visit?.attended_at ? `Arrived ${format(parseISO(visit.attended_at), "h:mm a")}, pass ${visit.gate_pass_code}` : visit ? `Gate pass ${visit.gate_pass_code}` : undefined;
    case 5:
      return app.reviewed_at ? `${OUTCOMES[app.outcome].label}${data.reviewed_by ? ` by ${data.reviewed_by}` : ""}` : undefined;
    case 6:
      return app.offer_accepted_at
        ? `Accepted ${day(app.offer_accepted_at)}`
        : app.offer_declined_at
          ? `Declined: ${app.offer_decline_reason.toLowerCase()}`
          : app.offer_expires_at
            ? `Open until ${day(app.offer_expires_at)}`
            : undefined;
    case 8: {
      const items = app.requirements.filter((r) => r.owner === "parent");
      const left = items.filter((r) => r.status !== "done").length;
      return items.length ? `${items.length - left} of ${items.length} family items done${app.joining_date ? `, joins ${day(app.joining_date)}` : ""}` : undefined;
    }
    case 9:
    case 10:
      return app.atlas_accounts ? `Student login ${app.atlas_accounts.student.email}` : undefined;
  }
}

/** What a finished step recorded, opened from the chronology */
function StepDetail({ step, app, data, onEdit }: { step: number; app: App; data: ApplicationDetail; onEdit: (section?: string) => void }) {
  if (step === 1)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          {app.documents.length} documents on file. Answers stay editable; the family sees your changes.
        </p>
        <Button size="sm" variant="outline" onClick={() => onEdit()}>
          <PencilIcon />
          Edit answers
        </Button>
      </div>
    );

  if (step === 2 || step === 7) {
    const kind = step === 2 ? "registration" : "admission";
    return (
      <ul className="space-y-1.5">
        {app.payments
          .filter((p) => p.kind === kind)
          .map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {formatCurrency(p.amount)} {p.gateway_payment_mode && `by ${p.gateway_payment_mode}`}
                {p.gateway_transaction_id && <span className="text-muted-foreground"> ({p.gateway_transaction_id})</span>}
              </span>
              <span className={cn("text-xs", p.status === "success" ? "text-green-700 dark:text-green-300" : "text-muted-foreground")}>
                {p.status} {day(p.paid_at ?? p.created_at)}
              </span>
            </li>
          ))}
      </ul>
    );
  }

  if ((step === 3 || step === 4) && app.visit)
    return (
      <p>
        {day(app.visit.slot.date)}, {app.visit.slot.start_time.slice(0, 5)}. {app.visit.slot.visit_type_label} at {app.visit.slot.gate || "the main gate"}
        {app.visit.slot.staff_names.length > 0 && `, with ${app.visit.slot.staff_names.join(" and ")}`}. Gate pass {app.visit.gate_pass_code}
        {app.visit.rescheduled_count > 0 && `, moved ${app.visit.rescheduled_count}×`}
.
      </p>
    );

  if (step === 5)
    return (
      <div>
        <p>
          {OUTCOMES[app.outcome].label}
          {app.reviewed_at && ` on ${day(app.reviewed_at)}`}
          {data.reviewed_by && ` by ${data.reviewed_by}`}.
        </p>
        {app.review_note && <blockquote className="mt-2 border-l-2 pl-3 italic">{app.review_note}</blockquote>}
      </div>
    );

  if (step === 6)
    return (
      <p>
        Offer sent {app.offer_sent_at ? day(app.offer_sent_at) : ""}
        {app.offer_extended_at && `, extended ${day(app.offer_extended_at)}`}
        {app.offer_accepted_at && `, accepted ${day(app.offer_accepted_at)}`}
        {app.offer_declined_at && `, declined ${day(app.offer_declined_at)} (${app.offer_decline_reason})`}.
      </p>
    );

  if (step === 8)
    return (
      <ul className="space-y-1">
        {app.requirements.map((r) => (
          <li key={r.id} className="flex justify-between gap-2">
            <span>{r.title}</span>
            <span className="text-xs text-muted-foreground">{r.status === "done" ? "Done" : r.status.replace("_", " ")}</span>
          </li>
        ))}
        {app.joining_date && <li className="pt-1 font-medium">Joins {day(app.joining_date)}</li>}
      </ul>
    );

  if (app.atlas_accounts)
    return (
      <ul className="space-y-1">
        <li>
          {app.atlas_accounts.student.name}: {app.atlas_accounts.student.email}
        </li>
        {app.atlas_accounts.guardians.map((g) => (
          <li key={g.email}>
            {g.name} ({g.relationship}): {g.email}
          </li>
        ))}
      </ul>
    );

  return <p className="text-muted-foreground">{stepLabel(step)} complete.</p>;
}

/** Step 1, still open: how far the form is, and where to pick it up */
function FillPrompt({ child, family, onEdit }: { child: FamilyChild; family: FamilyRecord; onEdit: (section?: string) => void }) {
  const progress = formProgress(family, child);
  const next = APPLICATION_SECTIONS.find((s) => !sectionStats(s, family, child).complete);
  return (
    <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-5">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums">{progress}%</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {next ? `Next missing: ${next.title.toLowerCase()}. The family can finish in Atlas, or you can fill it in with them.` : "Everything required is in. Submit it to move them to the registration fee."}
      </p>
      <Button className="mt-4" onClick={() => onEdit(next?.id)}>
        <PencilIcon />
        {next ? `Continue with ${next.title.toLowerCase()}` : "Review and submit"}
      </Button>
    </div>
  );
}

// ---- Every answer, editable --------------------------------------------------

function Answers({ child, family, onEdit }: { child: FamilyChild; family: FamilyRecord; onEdit: (section?: string) => void }) {
  return (
    <Card className="lg:sticky lg:top-4">
      <header className="border-b px-5 py-4">
        <h2 className="font-semibold">Application answers</h2>
        <p className="text-sm text-muted-foreground">Edit anything, before or after they submit.</p>
      </header>
      <ul className="divide-y">
        {APPLICATION_SECTIONS.map((s) => {
          const stats = sectionStats(s, family, child);
          const Icon = s.icon;
          return (
            <li key={s.id}>
              <button type="button" onClick={() => onEdit(s.id)} className="group flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                <Icon className={cn("size-4 shrink-0", stats.complete ? "text-muted-foreground" : "text-amber-600")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{s.title}</span>
                  <span className={cn("block text-xs", stats.complete ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300")}>
                    {stats.complete ? (s.scope === "family" ? "Complete, shared by siblings" : "Complete") : `${stats.missing} missing`}
                  </span>
                </span>
                <PencilIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="flex items-center gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
        <FileTextIcon className="size-3.5" />
        {child.documents.length} documents uploaded
      </footer>
    </Card>
  );
}

function AddChild({ leadId, onDone }: { leadId: number; onDone: (created?: number) => void }) {
  const add = useAddChild(leadId);
  const [name, setName] = useState({ first_name: "", last_name: "" });
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate(name, { onSuccess: (created) => onDone(created.id) });
      }}
    >
      <div className="grid flex-1 content-start gap-3 px-6 py-5 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">First name</span>
          <input autoFocus required className={cn(inputClass, "mt-1.5")} value={name.first_name} onChange={(e) => setName({ ...name, first_name: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="font-medium">Last name</span> <span className="text-muted-foreground">(optional)</span>
          <input className={cn(inputClass, "mt-1.5")} value={name.last_name} onChange={(e) => setName({ ...name, last_name: e.target.value })} />
        </label>
      </div>
      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.first_name.trim() || add.isPending}>
          {add.isPending && <Loader2Icon className="animate-spin" />}
          Add and fill in
        </Button>
      </footer>
    </form>
  );
}
