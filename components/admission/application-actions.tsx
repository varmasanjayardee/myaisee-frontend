"use client";

import { useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { BanknoteIcon, CheckIcon, CopyIcon, KeyRoundIcon, LinkIcon, Loader2Icon, PencilLineIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/use-today";
import { formatCurrency, isClosed, OUTCOMES } from "@/lib/admission";
import { cn } from "@/lib/utils";
import type { AccountsCreated, ApplicationDetail } from "@/schemas/admission.schema";
import {
  useCheckIn,
  useConfirmForFamily,
  useCreateAccounts,
  useDecide,
  useFamilyFees,
  useFamilySlots,
  useOfferForFamily,
  useOfflinePayment,
  useOptions,
  usePaymentLink,
  useSetJoiningDate,
  useUpdateRequirement,
  useUploadForFamily,
  useVisitForFamily,
  type Decision,
} from "@/services/admission.service";

type App = ApplicationDetail["application"];

const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30";

/** The one thing to do for this family now, by step */
export function NextAction({ detail }: { detail: ApplicationDetail }) {
  const app = detail.application;
  const step = app.current_step;
  // The lead: every "do it for the family" action goes through staff/leads/<id>/
  const leadId = detail.family.id;

  if (isClosed(app.outcome)) {
    return (
      <Panel title={`${OUTCOMES[app.outcome].label}`} tone="closed">
        <p className="text-sm text-muted-foreground">
          {app.outcome === "declined"
            ? `The family declined the offer${app.offer_declined_at ? ` on ${short(app.offer_declined_at)}` : ""}${app.offer_decline_reason ? `: ${app.offer_decline_reason.toLowerCase()}` : ""}.`
            : app.outcome === "withdrawn"
              ? `The offer lapsed${app.offer_expires_at ? ` on ${short(app.offer_expires_at)}` : ""} without an answer.`
              : `Decided${app.reviewed_at ? ` on ${short(app.reviewed_at)}` : ""}${detail.reviewed_by ? ` by ${detail.reviewed_by}` : ""}.`}
        </p>
        {app.review_note && <blockquote className="mt-3 border-l-2 pl-3 text-sm italic">{app.review_note}</blockquote>}
      </Panel>
    );
  }

  switch (step) {
    case 1:
      return (
        <Panel title="The application isn't submitted yet">
          <p className="text-sm text-muted-foreground">The family can finish it in Atlas, or you can fill it in with them on a call or at the desk.</p>
          <Button className="mt-4" render={<Link href={`/admission/leads/${leadId}`} />} nativeButton={false}>
            <PencilLineIcon />
            Fill in for the family
          </Button>
        </Panel>
      );
    case 2:
    case 7:
      return <PaymentPanel app={app} leadId={leadId} kind={step === 2 ? "registration" : "admission"} />;
    case 3:
      return (
        <Panel title="Book the campus visit">
          <p className="text-sm text-muted-foreground">
            The family can book in Atlas, or pick a slot with them here. Missing a time?{" "}
            <Link href="/admission/slots" className="font-medium text-brand hover:underline">
              Open more slots
            </Link>
          </p>
          <SlotPicker leadId={leadId} childId={app.id} action="book" />
        </Panel>
      );
    case 4:
      return <VisitPanel app={app} leadId={leadId} />;
    case 5:
      return <DecisionPanel app={app} />;
    case 6:
      return <OfferPanel app={app} leadId={leadId} />;
    case 8:
      return <JoiningPanel app={app} leadId={leadId} />;
    case 9:
      return <AccountsPanel app={app} />;
    default:
      return (
        <Panel title="Enrolled">
          <p className="text-sm text-muted-foreground">
            Atlas accounts are live{app.atlas_accounts?.created_at && ` since ${short(app.atlas_accounts.created_at)}`}. Nothing more to do here.
          </p>
        </Panel>
      );
  }
}

const short = (iso: string) => format(parseISO(iso), "d MMM yyyy");

function Panel({ title, tone, children }: { title: string; tone?: "closed"; children: React.ReactNode }) {
  return (
    <section
      aria-label="Next action"
      className={cn("rounded-2xl border-2 p-5", tone === "closed" ? "border-muted bg-muted/40" : "border-brand/30 bg-brand/5")}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function PaymentPanel({ app, leadId, kind }: { app: App; leadId: number; kind: "registration" | "admission" }) {
  const attempts = app.payments.filter((p) => p.kind === kind);
  const latest = attempts[0];
  const fee = kind === "registration" ? "registration fee" : "admission fee";
  const fees = useFamilyFees(leadId, app.id);
  const total = fees.data?.[kind].total;

  return (
    <Panel title={`Waiting for the ${fee}${total ? ` of ${formatCurrency(total)}` : ""}`}>
      {!latest ? (
        <p className="text-sm text-muted-foreground">
          No payment started yet. If they can&apos;t see a fee, check there&apos;s a{" "}
          <Link href="/admission/fee-plans" className="font-medium text-brand hover:underline">
            fee plan
          </Link>{" "}
          for their campus, year and grade.
        </p>
      ) : (
        <p className="text-sm">
          Last attempt {formatCurrency(latest.amount)} on {short(latest.created_at)}:{" "}
          <span className={cn("font-medium", latest.status === "failed" ? "text-red-600" : "text-muted-foreground")}>
            {latest.status}
            {latest.failure_reason && ` (${latest.failure_reason})`}
          </span>
          . {attempts.length > 1 && `${attempts.length} attempts so far.`} Call to help them retry.
        </p>
      )}
      {total && <TakePayment leadId={leadId} childId={app.id} kind={kind} />}
    </Panel>
  );
}

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card at the desk" },
];

/** Two ways to collect: a payment link for the family, or money taken at the desk */
function TakePayment({ leadId, childId, kind }: { leadId: number; childId: number; kind: "registration" | "admission" }) {
  const link = usePaymentLink(leadId, childId);
  const offline = useOfflinePayment(leadId, childId);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-background p-4">
        <h3 className="text-sm font-semibold">Send a payment link</h3>
        <p className="mt-1 text-xs text-muted-foreground">They pay online with ICICI; the step completes on its own.</p>
        {link.data ? (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(link.data.redirect_url).then(() => toast.success("Link copied. Send it on WhatsApp or email."))}
            className="mt-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{link.data.redirect_url}</span>
            <CopyIcon className="size-4 shrink-0" />
          </button>
        ) : (
          <Button variant="outline" className="mt-3" disabled={link.isPending} onClick={() => link.mutate(kind)}>
            {link.isPending ? <Loader2Icon className="animate-spin" /> : <LinkIcon />}
            Create link
          </Button>
        )}
      </div>
      <form
        className="rounded-xl border bg-background p-4"
        onSubmit={(e) => {
          e.preventDefault();
          offline.mutate({ kind, method, reference });
        }}
      >
        <h3 className="text-sm font-semibold">They paid at the desk</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <select aria-label="Paid by" value={method} onChange={(e) => setMethod(e.target.value)} className={cn(field, "w-40")}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {method !== "cash" && (
            <input
              required
              aria-label="Reference"
              placeholder={method === "cheque" ? "Cheque number" : "Transaction reference"}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={cn(field, "min-w-0 flex-1")}
            />
          )}
        </div>
        <Button type="submit" className="mt-3" disabled={offline.isPending || (method !== "cash" && !reference.trim())}>
          {offline.isPending ? <Loader2Icon className="animate-spin" /> : <BanknoteIcon />}
          Record payment
        </Button>
      </form>
    </div>
  );
}

/** Open slots for the child's campus; books a first visit or moves the current one */
function SlotPicker({ leadId, childId, action, onDone }: { leadId: number; childId: number; action: "book" | "reschedule"; onDone?: () => void }) {
  const slots = useFamilySlots(leadId, childId);
  const visit = useVisitForFamily(leadId, childId);
  const [slot, setSlot] = useState<number | null>(null);
  const [hearingAid, setHearingAid] = useState(false);

  if (slots.isLoading) return <p className="mt-4 text-sm text-muted-foreground">Loading slots…</p>;
  if (!slots.data?.length) return <p className="mt-4 text-sm font-medium">No open slots for their campus right now.</p>;

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (slot) visit.mutate({ action, slot, hearing_aid: hearingAid }, { onSuccess: onDone });
      }}
    >
      <fieldset>
        <legend className="sr-only">Slot</legend>
        <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-3">
          {slots.data.map((s) => (
            <label
              key={s.id}
              className={cn(
                "cursor-pointer rounded-xl border bg-background p-3 text-sm has-checked:border-brand has-checked:ring-2 has-checked:ring-brand/30 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                !s.places_left && "cursor-not-allowed opacity-38"
              )}
            >
              <input type="radio" name="slot" className="sr-only" disabled={!s.places_left} checked={slot === s.id} onChange={() => setSlot(s.id)} />
              <span className="block font-medium">
                {format(parseISO(s.date), "EEE d MMM")}, {s.start_time.slice(0, 5)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {s.visit_type_label} · {s.places_left ? `${s.places_left} left` : "Full"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={hearingAid} onChange={(e) => setHearingAid(e.target.checked)} />
        Someone visiting uses a hearing aid
      </label>
      <Button type="submit" className="mt-3" disabled={!slot || visit.isPending}>
        {visit.isPending && <Loader2Icon className="animate-spin" />}
        {action === "book" ? "Book visit" : "Move visit"}
      </Button>
    </form>
  );
}

const DECLINE_REASONS = ["Chose another school", "Relocating", "Fees", "Timing", "Prefer not to say"];

/** The family's answer to the offer, taken by phone or in person */
function OfferPanel({ app, leadId }: { app: App; leadId: number }) {
  const offer = useOfferForFamily(leadId, app.id);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Panel title="Offer sent, waiting for their answer">
      <p className="text-sm text-muted-foreground">
        {app.offer_expires_at && `Open until ${format(parseISO(app.offer_expires_at), "EEE d MMM, h:mm a")}`}
        {app.offer_extended_at && " · extended once"}
        {app.offer_expires_at && ` (${formatDistanceToNowStrict(parseISO(app.offer_expires_at), { addSuffix: true })}).`}
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-4">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            The family has told me they accept, and knows the admission fee is next
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!confirmed || offer.isPending} onClick={() => offer.mutate({ action: "accept", agreed: true })}>
              <CheckIcon />
              Accept for them
            </Button>
            {!app.offer_extended_at && (
              <Button variant="outline" disabled={offer.isPending} onClick={() => offer.mutate({ action: "extend" })}>
                Extend 7 days
              </Button>
            )}
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <label className="block text-sm">
            <span className="font-medium">They&apos;re declining because</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={cn(field, "mt-1.5")}>
              <option value="">Choose</option>
              {DECLINE_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <Button variant="destructive" className="mt-3" disabled={!reason || offer.isPending} onClick={() => offer.mutate({ action: "decline", reason })}>
            Decline offer
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function VisitPanel({ app, leadId }: { app: App; leadId: number }) {
  const checkIn = useCheckIn();
  const change = useVisitForFamily(leadId, app.id);
  const [moving, setMoving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const visit = app.visit;
  const today = useToday();

  if (!visit) return <Panel title="Visit">No visit booked.</Panel>;
  const isToday = visit.slot.date === today;

  return (
    <Panel title={isToday ? "Visiting today" : `Visit on ${format(parseISO(visit.slot.date), "EEE d MMM")}`}>
      <p className="text-sm text-muted-foreground">
        {visit.slot.start_time.slice(0, 5)} · {visit.slot.visit_type_label} · {visit.slot.gate} · pass {visit.gate_pass_code}
        {visit.hearing_aid && " · someone uses a hearing aid"}
      </p>
      {isToday && (
        <Button className="mt-4" onClick={() => checkIn.mutate(visit.id)} disabled={checkIn.isPending}>
          {checkIn.isPending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          Check in
        </Button>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Button variant="outline" size="sm" onClick={() => setMoving(!moving)}>
          {moving ? "Keep this time" : "Reschedule"}
        </Button>
        {cancelling ? (
          <>
            <Button variant="destructive" size="sm" disabled={change.isPending} onClick={() => change.mutate({ action: "cancel" })}>
              Yes, cancel the visit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCancelling(false)}>
              No
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>
            Cancel visit
          </Button>
        )}
      </div>
      {moving && <SlotPicker leadId={leadId} childId={app.id} action="reschedule" onDone={() => setMoving(false)} />}
    </Panel>
  );
}

const DECISIONS: { value: Decision; label: string; hint: string }[] = [
  { value: "accepted", label: "Accept", hint: "Sends a 7-day offer" },
  { value: "waiting_list", label: "Waiting list", hint: "Stays in review" },
  { value: "rejected", label: "Rejected", hint: "Closes the application" },
  { value: "not_offered", label: "Not offered", hint: "No seat; closes it" },
];

function DecisionPanel({ app }: { app: App }) {
  const decide = useDecide(app.id);
  const [choice, setChoice] = useState<Decision | null>(app.outcome === "waitlisted" ? "waiting_list" : null);
  const [note, setNote] = useState(app.review_note);

  return (
    <Panel title={app.outcome === "waitlisted" ? "On the waiting list: decide again when a seat opens" : "Decide after the visit"}>
      <fieldset>
        <legend className="sr-only">Decision</legend>
        <div className="grid gap-2 sm:grid-cols-4">
          {DECISIONS.map((d) => (
            <label
              key={d.value}
              className={cn(
                "cursor-pointer rounded-xl border bg-background p-3 has-checked:border-brand has-checked:ring-2 has-checked:ring-brand/30 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                (d.value === "rejected" || d.value === "not_offered") && "has-checked:border-red-500 has-checked:ring-red-500/20"
              )}
            >
              <input type="radio" name="decision" value={d.value} checked={choice === d.value} onChange={() => setChoice(d.value)} className="sr-only" />
              <span className="block font-medium">{d.label}</span>
              <span className="block text-xs text-muted-foreground">{d.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm">
        <span className="font-medium">Note to the family</span>
        <span className="text-muted-foreground"> (optional, they see it with the decision)</span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          className="mt-1.5 w-full rounded-lg border bg-background p-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
      </label>
      <Button className="mt-3" disabled={!choice || decide.isPending} onClick={() => choice && decide.mutate({ status: choice, note })}>
        {decide.isPending && <Loader2Icon className="animate-spin" />}
        Save decision
      </Button>
    </Panel>
  );
}

const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", scheduled: "Scheduled", done: "Done" } as const;

function JoiningPanel({ app, leadId }: { app: App; leadId: number }) {
  const setDate = useSetJoiningDate(app.id);
  const confirm = useConfirmForFamily(leadId, app.id);
  const upload = useUploadForFamily(leadId, app.id);
  const parentItems = app.requirements.filter((r) => r.owner === "parent");
  const update = useUpdateRequirement();
  const [date, setDateValue] = useState(app.joining_date ?? "");
  const parentLeft = app.requirements.filter((r) => r.owner === "parent" && r.status !== "done").length;
  const schoolItems = app.requirements.filter((r) => r.owner !== "parent");

  return (
    <Panel title={app.joining_date ? "Before joining" : "Confirm the joining date"}>
      <p className="text-sm text-muted-foreground">
        {parentLeft ? `The family has ${parentLeft} item${parentLeft === 1 ? "" : "s"} left.` : "The family has finished their part."}{" "}
        Accounts open once both the checklist and the joining date are done.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (date) setDate.mutate(date);
        }}
      >
        <label className="text-sm">
          <span className="font-medium">First day</span>
          <input type="date" value={date} onChange={(e) => setDateValue(e.target.value)} className={cn(field, "mt-1.5 w-48")} required />
        </label>
        <Button type="submit" disabled={!date || date === app.joining_date || setDate.isPending}>
          {setDate.isPending && <Loader2Icon className="animate-spin" />}
          {app.joining_date ? "Change date" : "Set joining date"}
        </Button>
      </form>

      {parentItems.length > 0 && (
        <ul className="mt-5 divide-y rounded-xl border bg-background" aria-label="The family's checklist">
          {parentItems.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">Family{r.due_date && ` · due ${format(parseISO(r.due_date), "d MMM")}`}</span>
              </span>
              {r.status === "done" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
                  <CheckIcon className="size-3.5" />
                  Done
                </span>
              ) : r.action === "upload" ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/40">
                  {upload.isPending && upload.variables?.kind === r.document_kind ? <Loader2Icon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
                  Upload for them
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) upload.mutate({ kind: r.document_kind, file }, { onSuccess: () => toast.success(`${r.title} uploaded`) });
                    }}
                  />
                </label>
              ) : (
                <Button size="sm" variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate(r.id)}>
                  Mark done
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {schoolItems.length > 0 && (
        <ul className="mt-5 divide-y rounded-xl border bg-background">
          {schoolItems.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {r.owner === "operations" ? "Operations" : "School"}
                  {r.due_date && ` · due ${format(parseISO(r.due_date), "d MMM")}`}
                </span>
              </span>
              <select
                aria-label={`${r.title} status`}
                value={r.status}
                disabled={update.isPending}
                onChange={(e) => update.mutate({ id: r.id, status: e.target.value })}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AccountsPanel({ app }: { app: App }) {
  const create = useCreateAccounts(app.id);
  const options = useOptions(app.campus);
  const [created, setCreated] = useState<AccountsCreated | null>(null);
  const [form, setForm] = useState({ student_email: "", academic_class_id: "", admission_number: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (created) return <CreatedAccounts created={created} />;

  const classes = options.data?.classes ?? [];

  return (
    <Panel title="Create Atlas accounts">
      <p className="text-sm text-muted-foreground">
        One student login and one for each parent on the application. Parents who already have Atlas (an older sibling) keep theirs.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setErrors({});
          create.mutate(
            { ...form, academic_class_id: Number(form.academic_class_id) },
            {
              onSuccess: (result) => {
                setCreated(result);
                toast.success("Accounts created");
              },
              onError: (error) => {
                const data = (error.cause as { response?: { data?: Record<string, unknown> } })?.response?.data ?? {};
                const fieldErrors = Object.fromEntries(
                  Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, String((v as string[])[0])])
                );
                setErrors(fieldErrors);
                if (!Object.keys(fieldErrors).length) toast.error(error.message);
              },
            }
          );
        }}
      >
        <label className="text-sm">
          <span className="font-medium">Student login email</span>
          <input
            type="email"
            required
            value={form.student_email}
            onChange={(e) => setForm({ ...form, student_email: e.target.value })}
            placeholder="first.last@school.edu"
            aria-invalid={!!errors.student_email}
            className={cn(field, "mt-1.5 aria-invalid:border-red-500")}
          />
          {errors.student_email && <span className="mt-1 block text-xs text-red-600">{errors.student_email}</span>}
        </label>
        <label className="text-sm">
          <span className="font-medium">Class</span>
          <select
            required
            value={form.academic_class_id}
            onChange={(e) => setForm({ ...form, academic_class_id: e.target.value })}
            aria-invalid={!!errors.academic_class_id}
            className={cn(field, "mt-1.5")}
          >
            <option value="">{options.isLoading ? "Loading…" : "Choose"}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.academic_class_id && <span className="mt-1 block text-xs text-red-600">{errors.academic_class_id}</span>}
        </label>
        <label className="text-sm">
          <span className="font-medium">Admission number</span> <span className="text-muted-foreground">(optional)</span>
          <input
            value={form.admission_number}
            onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
            className={cn(field, "mt-1.5")}
          />
          {errors.admission_number && <span className="mt-1 block text-xs text-red-600">{errors.admission_number}</span>}
        </label>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2Icon className="animate-spin" /> : <KeyRoundIcon />}
            Create accounts
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/** Temporary passwords exist only in this response; show them once to hand over */
function CreatedAccounts({ created }: { created: AccountsCreated }) {
  const rows = [
    { who: `${created.student.name} (student)`, email: created.student.email, password: created.student.temporary_password },
    ...created.guardians.map((g) => ({ who: g.name, email: g.email, password: g.temporary_password })),
  ];
  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copied"));

  return (
    <Panel title={`Accounts created · ${created.class}`}>
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
        Copy these temporary passwords now and hand them to the family. They are not stored and won&apos;t be shown again.
      </p>
      <ul className="mt-4 divide-y rounded-xl border bg-background">
        {rows.map((r) => (
          <li key={r.email} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{r.who}</span>
              <span className="block text-muted-foreground">{r.email}</span>
            </span>
            {r.password ? (
              <button
                type="button"
                onClick={() => copy(`${r.email}\n${r.password}`)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm hover:bg-muted"
                aria-label={`Copy login for ${r.who}`}
              >
                {r.password}
                <CopyIcon className="size-3.5" />
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Existing Atlas login, unchanged</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
