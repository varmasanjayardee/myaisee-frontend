"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInMonths, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Loader2Icon, MailIcon, MessageSquareIcon, PencilIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/use-today";
import { isClosed, OUTCOMES } from "@/lib/admission";
import { GRADE_STAGE_LABEL } from "@/lib/application-form";
import { cn } from "@/lib/utils";
import { useDraftMessage, useLogNote, type FamilyChild, type FamilyRecord } from "@/services/admission.service";
import { inputClass } from "./side-drawer";
import { Card } from "./ui";

type Guardian = { relationship?: string; name?: string; mobile?: string; email?: string; is_primary?: boolean };

const RELATION = { mother: "Mother", father: "Father", guardian: "Guardian" } as Record<string, string>;

/** Where the child is, in the words a counsellor uses; amber when it's on us */
function status(child: FamilyChild | undefined, today: string | null): { text: string; tone: "good" | "you" | "closed" } | null {
  if (!child) return null;
  if (isClosed(child.outcome)) return { text: OUTCOMES[child.outcome].label, tone: "closed" };
  const day = (iso: string) => format(parseISO(iso), "d MMM");
  const visit = child.visit?.status === "booked" ? child.visit.slot : null;
  switch (child.current_step) {
    case 1:
      return { text: "Filling in the application", tone: "good" };
    case 2:
      return { text: "Registration fee due", tone: "good" };
    case 3:
      return { text: "Needs a visit slot", tone: "good" };
    case 4:
      return visit?.date === today
        ? { text: "Visit today, watch arrivals", tone: "you" }
        : { text: visit ? `Visiting ${day(visit.date)}` : "Visit booked", tone: "good" };
    case 5:
      return child.aptitude_test_at
        ? { text: `Aptitude test ${day(child.aptitude_test_at)}`, tone: "you" }
        : { text: "Schedule the aptitude test", tone: "you" };
    case 6:
      return { text: child.outcome === "waitlisted" ? "On the waiting list" : "Waiting for your decision", tone: "you" };
    case 7:
      return { text: "Offer sent, waiting for their answer", tone: "good" };
    case 8:
      return { text: "Admission fee due", tone: "good" };
    case 9:
      return { text: "Before-joining checklist", tone: "good" };
    case 10:
      return { text: "Ready for Atlas accounts", tone: "you" };
    default:
      return { text: "Enrolled", tone: "good" };
  }
}

/** "3 years 9 months" on the first day of the session (1 April of the academic year) */
function ageAtStart(dob: string | null, year: string) {
  const start = year.match(/^(\d{4})/)?.[1];
  if (!dob || !start) return null;
  const months = differenceInMonths(parseISO(`${start}-04-01`), parseISO(dob));
  if (months < 0) return null;
  const [y, m] = [Math.floor(months / 12), months % 12];
  return `age ${y} year${y === 1 ? "" : "s"}${m ? ` ${m} month${m === 1 ? "" : "s"}` : ""} at session start`;
}

/** Who the family is at a glance: the child in focus, references, parents, home and the enquiry */
export function FamilyCard({
  family,
  child,
  onMessage,
  onDraft,
  onNote,
}: {
  family: FamilyRecord;
  child: FamilyChild | undefined;
  onMessage: () => void;
  onDraft: () => void;
  onNote: () => void;
}) {
  const today = useToday();
  const surname = (family.last_name || family.first_name).trim();
  const state = status(child, today);
  const guardians = family.guardians as Guardian[];
  // Before the form is filled, the parent who enquired is the only contact we have
  const contacts: Guardian[] = guardians.length
    ? guardians
    : [{ relationship: "parent", name: `${family.first_name} ${family.last_name}`.trim(), mobile: family.phone_number, email: family.email }];
  const grade = child?.grade ? `${child.grade}${GRADE_STAGE_LABEL[child.grade] ? ` (${GRADE_STAGE_LABEL[child.grade]})` : ""}` : "";
  const facts = child
    ? [`${child.first_name} ${child.last_name}`.trim(), grade, child.academic_year_name, family.locality as string, ageAtStart(child.date_of_birth, child.academic_year_name ?? "")]
    : [`No child added yet`];

  return (
    <Card>
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
        <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand/10 text-2xl font-semibold text-brand">
          {surname.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{surname} family</h1>
            {state && (
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", state.tone === "good" ? "bg-green-600 dark:bg-green-300" : state.tone === "you" ? "bg-amber-500 dark:bg-amber-300" : "bg-red-600")}
                />
                {state.text}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">{facts.filter(Boolean).join(" · ")}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{family.desk.reference}</span>
            {child?.reference && <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{child.reference}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button size="lg" onClick={onMessage}>
            <MessageSquareIcon />
            Message
          </Button>
          <Button size="lg" variant="ghost" onClick={onDraft} className="bg-brand/10 text-brand hover:bg-brand/15 hover:text-brand">
            <SparklesIcon />
            Draft with Atlas
          </Button>
          <Button size="lg" variant="outline" onClick={onNote}>
            <PencilIcon />
            Log a note
            {family.desk.notes.length > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{family.desk.notes.length}</span>}
          </Button>
        </div>
      </div>

      <dl className="grid gap-6 border-t px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {contacts.slice(0, 2).map((g, i) => (
          <div key={i} className="min-w-0">
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{RELATION[g.relationship ?? ""] ?? "Parent"}</dt>
            <dd className="mt-1.5">
              <span className="block">{g.name || "—"}</span>
              <span className="block text-sm break-words text-muted-foreground">
                {g.mobile && (
                  <a href={`tel:${g.mobile}`} className="hover:text-brand">
                    {g.mobile}
                  </a>
                )}
                {g.mobile && g.email && " · "}
                {g.email && (
                  <a href={`mailto:${g.email}`} className="hover:text-brand">
                    {g.email}
                  </a>
                )}
              </span>
            </dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Home</dt>
          <dd className="mt-1.5">
            <span className="block">{[family.locality, family.city].filter(Boolean).join(", ") || "Not given yet"}</span>
            {typeof family.address_line1 === "string" && family.address_line1 && <span className="block text-sm text-muted-foreground">{family.address_line1}</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Enquiry</dt>
          <dd className="mt-1.5">
            <span className="block">
              {family.desk.channel} · {format(parseISO(family.created_at), "d MMM")}
            </span>
            <span className="block text-sm text-muted-foreground">
              {family.desk.created_by ? `Added by ${family.desk.created_by}` : `Came in ${formatDistanceToNowStrict(parseISO(family.created_at), { addSuffix: true })}`}
            </span>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** Write to the family on WhatsApp or email, optionally starting from an Atlas draft. Opens their own app to send. */
export function MessageForm({ family, child, draftFirst, onDone }: { family: FamilyRecord; child: FamilyChild | undefined; draftFirst: boolean; onDone: () => void }) {
  const draft = useDraftMessage(family.id);
  const guardians = (family.guardians as Guardian[]).filter((g) => g.mobile || g.email);
  const people = guardians.length ? guardians : [{ name: `${family.first_name} ${family.last_name}`.trim(), mobile: family.phone_number, email: family.email }];
  const [to, setTo] = useState(Math.max(0, people.findIndex((g) => g.is_primary)));
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [about, setAbout] = useState("");
  const [text, setText] = useState("");
  const person = people[to];

  const ask = () => draft.mutate({ child: child?.id, channel, about }, { onSuccess: setText });
  // "Draft with Atlas" from the card: start drafting as the drawer opens (once, even under Strict Mode)
  const started = useRef(false);
  useEffect(() => {
    if (!draftFirst || started.current) return;
    started.current = true;
    draft.mutate({ child: child?.id, channel: "whatsapp" }, { onSuccess: setText });
  }, [draftFirst, draft, child?.id]);

  const digits = (person.mobile ?? "").replace(/\D/g, "");
  const href =
    channel === "whatsapp"
      ? `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(text)}`
      : `mailto:${person.email}?subject=${encodeURIComponent("Your application to Ardee")}&body=${encodeURIComponent(text)}`;
  const reachable = channel === "whatsapp" ? !!digits : !!person.email;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">To</span>
            <select className={cn(inputClass, "mt-1.5")} value={to} onChange={(e) => setTo(Number(e.target.value))}>
              {people.map((g, i) => (
                <option key={i} value={i}>
                  {g.name || "Parent"}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm">
            <legend className="font-medium">On</legend>
            <div className="mt-1.5 flex gap-2">
              {(["whatsapp", "email"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={channel === c}
                  onClick={() => setChannel(c)}
                  className="h-10 flex-1 rounded-lg border px-3 font-medium aria-pressed:border-brand aria-pressed:bg-brand/10 aria-pressed:text-brand"
                >
                  {c === "whatsapp" ? "WhatsApp" : "Email"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4">
          <label className="block text-sm">
            <span className="font-medium">Ask Atlas to draft it</span>
            <span className="text-muted-foreground"> (optional: what you want to say)</span>
            <input className={cn(inputClass, "mt-1.5")} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Remind them the visit is tomorrow at 10" />
          </label>
          <Button variant="ghost" className="mt-3 bg-brand/10 text-brand hover:bg-brand/15 hover:text-brand" disabled={draft.isPending} onClick={ask}>
            {draft.isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            {text ? "Draft again" : "Draft with Atlas"}
          </Button>
        </div>

        <label className="block text-sm">
          <span className="font-medium">Message</span>
          <textarea rows={8} className={cn(inputClass, "mt-1.5 h-auto py-2")} value={text} onChange={(e) => setText(e.target.value)} placeholder={draft.isPending ? "Atlas is drafting…" : ""} />
          <span className="mt-1 block text-xs text-muted-foreground">Read it before sending: Atlas only knows what&apos;s on the application.</span>
        </label>
      </div>
      <footer className="flex justify-end gap-2 border-t px-6 py-4">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button render={<a href={reachable && text.trim() ? href : undefined} target="_blank" rel="noreferrer" />} nativeButton={false} disabled={!reachable || !text.trim()} onClick={onDone}>
          {channel === "whatsapp" ? <MessageSquareIcon /> : <MailIcon />}
          {channel === "whatsapp" ? "Open in WhatsApp" : "Open in email"}
        </Button>
      </footer>
    </div>
  );
}

/** The enquiry's notes, newest first, with a box to add one */
export function NoteForm({ family, onDone }: { family: FamilyRecord; onDone: () => void }) {
  const log = useLogNote(family.id);
  const [body, setBody] = useState("");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        className="space-y-3 border-b px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault();
          log.mutate(body, { onSuccess: () => setBody("") });
        }}
      >
        <label className="block text-sm">
          <span className="font-medium">New note</span>
          <textarea autoFocus rows={4} className={cn(inputClass, "mt-1.5 h-auto py-2")} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Called at 4pm. Mother prefers WhatsApp; father joins the visit." />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Close
          </Button>
          <Button type="submit" disabled={!body.trim() || log.isPending}>
            {log.isPending && <Loader2Icon className="animate-spin" />}
            Save note
          </Button>
        </div>
      </form>
      <ol className="flex-1 divide-y overflow-y-auto">
        {family.desk.notes.length === 0 && <li className="px-6 py-5 text-sm text-muted-foreground">No notes yet. Only staff see them.</li>}
        {family.desk.notes.map((n) => (
          <li key={n.id} className="px-6 py-4">
            <p className="text-sm whitespace-pre-wrap">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {n.by ?? "Staff"}, {format(parseISO(n.created_at), "d MMM, h:mm a")}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
