"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AxiosError } from "axios";
import { CheckIcon, ChevronDownIcon, Loader2Icon, MinusIcon, PlusIcon, UploadIcon, UsersIcon, LandmarkIcon } from "lucide-react";
import { toast } from "sonner";
import { EnquiryForm } from "@/components/admission/enquiry-form";
import { cn } from "@/lib/utils";
import type { ParentLookup } from "@/schemas/visitor.schema";
import { useParentLookup, useSaveVisitor, useUploadVisitorFile, useVisitorOptions } from "@/services/visitor.service";
import { PhotoField } from "./photo-field";
import { BackButton, Floating, PersonPhoto, SchoolMark, Screen, fieldClass, primaryButton, secondaryButton } from "./ui";

/** Step one of adding a visitor */
export function ChooseVisitorType() {
  return (
    <Screen>
      <BackButton href="/visitor" />
      <SchoolMark />
      <h1 className="text-center text-2xl font-bold text-brand">Choose Visitor Type</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Kindly select the visitor type to proceed further.</p>
      <div className="mt-10 grid grid-cols-[1fr_1px_1fr] gap-4">
        <TypeCard href="/visitor/add/parent" src="/visitor/parent.png" label="Parent" />
        <span className="bg-border" />
        <TypeCard href="/visitor/add/general" src="/visitor/general.png" label="General Visitor" />
      </div>
    </Screen>
  );
}

function TypeCard({ href, src, label }: { href: string; src: string; label: string }) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-4 rounded-xl py-2">
      <Image src={src} alt="" width={146} height={146} className="rounded-full transition-transform group-hover:scale-105 motion-reduce:transform-none" />
      <b className="font-semibold">{label}</b>
    </Link>
  );
}

const selectChevron = <ChevronDownIcon className="pointer-events-none absolute top-4 right-3.5 size-4 text-muted-foreground" />;

function showError(error: Error) {
  const data = (error.cause as AxiosError | undefined)?.response?.data;
  toast.error(data ? error.message : "That didn't save. Try again.");
}

// ---- Parent: mobile number, choose student and parent, then the form ----

export function ParentFlow() {
  const router = useRouter();
  const lookup = useParentLookup();
  const [phone, setPhone] = useState("");
  const [family, setFamily] = useState<ParentLookup | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [guardianId, setGuardianId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    lookup.mutate(phone, {
      onSuccess: (found) => {
        // Nobody on the school's records: carry on as a general visitor, number filled in
        if (!found.students.length) {
          toast.info("No family has this number. Continue as a general visitor.");
          router.push(`/visitor/add/general?phone=${encodeURIComponent(phone)}`);
          return;
        }
        setFamily(found);
        setStudentId(found.students[0].id);
        setGuardianId(found.guardians.length === 1 ? found.guardians[0].id : null);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const student = family?.students.find((s) => s.id === studentId);
  const guardian = family?.guardians.find((g) => g.id === guardianId);

  if (formOpen && student && guardian) {
    return <ParentForm phone={phone} student={student} guardian={guardian} onBack={() => setFormOpen(false)} />;
  }

  if (family) {
    return (
      <Screen>
        <BackButton onClick={() => setFamily(null)} />
        <h2 className="mt-5 mb-3 text-lg font-semibold">Student</h2>
        <div className="space-y-3">
          {family.students.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === studentId} onClick={() => setStudentId(s.id)} className="flex w-full items-center gap-4 rounded-xl border p-4 text-left">
              <PersonPhoto name={s.name} size={56} />
              <span className="min-w-0 flex-1">
                <b className="block font-semibold">{s.name}</b>
                <span className="text-sm text-muted-foreground">Adm. No: <b className="font-semibold text-foreground">{s.admission_number ?? "Not set"}</b>{s.class && <> | Class: <b className="font-semibold text-foreground">{s.class}</b></>}</span>
              </span>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", s.id === studentId && "border-sky-500 bg-sky-500 text-white")}>
                {s.id === studentId && <CheckIcon className="size-4" />}
              </span>
            </button>
          ))}
        </div>
        <h2 className="mt-7 mb-3 text-lg font-semibold">Visitor</h2>
        <div className="grid grid-cols-2 gap-3">
          {family.guardians.map((g) => (
            <button key={g.id} type="button" aria-pressed={g.id === guardianId} onClick={() => setGuardianId(g.id)} className={cn("relative flex flex-col items-center gap-2 rounded-xl border bg-muted/40 p-4", g.id === guardianId && "border-brand")}>
              <span className={cn("absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full border bg-background", g.id === guardianId && "border-sky-500 bg-sky-500 text-white")}>
                {g.id === guardianId && <CheckIcon className="size-3.5" />}
              </span>
              <PersonPhoto name={g.name} src={g.photo_url} size={48} />
              <b className="text-center text-sm font-semibold">{g.name}</b>
              <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-sky-600 uppercase dark:bg-sky-950 dark:text-sky-300">{g.relationship}</span>
            </button>
          ))}
        </div>
        <button type="button" disabled={!student || !guardian} onClick={() => setFormOpen(true)} className={cn(primaryButton, "mt-auto")}>
          Continue
        </button>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton href="/visitor/add" />
      <SchoolMark />
      <Image src="/visitor/parent.png" alt="" width={146} height={146} className="mx-auto rounded-full" />
      <span className="mx-auto mt-4 rounded-md bg-sky-50 px-5 py-1.5 text-sm font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">Parent</span>
      <h1 className="mt-5 text-xl font-bold text-brand">Mobile Number</h1>
      <p className="mt-1 text-sm text-muted-foreground">Kindly provide the mobile number registered with the school.</p>
      <form onSubmit={find} className="mt-5 space-y-4">
        <input aria-label="Mobile number" required type="tel" inputMode="tel" autoComplete="off" placeholder="Enter Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(fieldClass, "h-13")} />
        <button type="submit" disabled={lookup.isPending || phone.replace(/\D/g, "").length < 10} className={primaryButton}>
          {lookup.isPending && <Loader2Icon className="size-4 animate-spin" />}
          Continue
        </button>
      </form>
    </Screen>
  );
}

function ParentForm({ phone, student, guardian, onBack }: { phone: string; student: ParentLookup["students"][number]; guardian: ParentLookup["guardians"][number]; onBack: () => void }) {
  const router = useRouter();
  const options = useVisitorOptions();
  const save = useSaveVisitor();
  const [purpose, setPurpose] = useState("parent");
  const [host, setHost] = useState("");
  const [guests, setGuests] = useState(0);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const upload = useUploadVisitorFile();
  const busy = save.isPending || upload.isPending;
  const box = "relative block rounded-xl border px-3.5 py-3";
  const small = "block text-xs font-medium tracking-wide text-muted-foreground uppercase";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const photoKey = photo ? { photo_key: await upload.mutateAsync({ kind: "photo", file: photo }) } : {};
      const saved = await save.mutateAsync({ values: { name: guardian.name, phone_number: phone, purpose, host: Number(host), party_size: guests + 1, notes, student: student.id, guardian: guardian.id, check_in: true, ...photoKey } });
      router.push(`/visitor/pass/${saved.id}`);
    } catch (error) {
      showError(error as Error);
    }
  };

  return (
    <Screen>
      <BackButton onClick={onBack} />
      <div className="my-6 flex flex-col items-center gap-2">
        <PhotoField name={guardian.name} savedSrc={guardian.photo_url} onChange={setPhoto} />
        <b className="text-lg font-semibold">{guardian.name}</b>
        <span className="text-xs text-muted-foreground"><span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">{guardian.relationship} / Guardian</span> · {student.class || student.name}</span>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-3.5">
        <label className={box}>
          <span className={small}>Meeting Purpose <span className="text-destructive">*</span></span>
          <select required value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-1 w-full appearance-none bg-transparent text-sm outline-none">
            {options.data?.purposes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {selectChevron}
        </label>
        <label className={box}>
          <span className={small}>Select Meeting With <span className="text-destructive">*</span></span>
          <select required value={host} onChange={(e) => setHost(e.target.value)} className="mt-1 w-full appearance-none bg-transparent text-sm outline-none">
            <option value="">Select Staff / Authority</option>
            {options.data?.hosts.map((h) => <option key={h.id} value={h.id}>{h.name}{h.role ? `, ${h.role}` : ""}</option>)}
          </select>
          {selectChevron}
        </label>
        <div className={cn(box, "flex items-center justify-between")}>
          <span>
            <span className={small}>No. of Additional Visitors</span>
            <span className="text-xs text-muted-foreground">Accompanying guests</span>
          </span>
          <span className="flex items-center gap-2 rounded-full bg-muted p-1">
            <button type="button" aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(0, g - 1))} className="grid size-7 place-items-center rounded-full bg-background"><MinusIcon className="size-3.5" /></button>
            <b className="w-6 text-center text-sm">{guests}</b>
            <button type="button" aria-label="More guests" onClick={() => setGuests((g) => Math.min(49, g + 1))} className="grid size-7 place-items-center rounded-full bg-background"><PlusIcon className="size-3.5" /></button>
          </span>
        </div>
        <label className={box}>
          <span className={small}>Description / Remarks</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add meeting notes or purpose details..." className="mt-1 w-full resize-none bg-transparent text-sm outline-none" />
        </label>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button type="button" onClick={onBack} className={secondaryButton}>Back</button>
          <button type="submit" disabled={busy} className={cn(primaryButton, "rounded-xl")}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            Submit
          </button>
        </div>
      </form>
    </Screen>
  );
}

// ---- General: Walk-In or Appointment, General or Admission, then the form ----

export function GeneralFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"walk_in" | "appointment">("walk_in");
  const [purpose, setPurpose] = useState<"general" | "admission">("general");
  const [step, setStep] = useState<"purpose" | "form" | "enquiry">("purpose");

  if (step === "enquiry") {
    return (
      <Screen>
        <BackButton onClick={() => setStep("purpose")} />
        <h1 className="mt-5 mb-4 text-xl font-bold text-brand">Admission enquiry</h1>
        <EnquiryForm onDone={() => router.push("/visitor")} />
      </Screen>
    );
  }
  if (step === "form") return <GeneralForm appointment={tab === "appointment"} phone={params.get("phone") ?? ""} onBack={() => setStep("purpose")} />;

  const choices = [
    { value: "general", icon: UsersIcon, title: "General", text: "If you wish to meet school's staff." },
    { value: "admission", icon: LandmarkIcon, title: "Admission", text: "If you want to enquire about admissions in school." },
  ] as const;

  return (
    <Screen>
      <BackButton href="/visitor/add" />
      <div role="tablist" className="mt-4 grid grid-cols-2 border-b">
        {([["walk_in", "Walk-In"], ["appointment", "Appointment"]] as const).map(([value, label]) => (
          <button key={value} role="tab" type="button" aria-selected={tab === value} onClick={() => setTab(value)} className={cn("-mb-px border-b-[3px] py-2.5 text-[17px] font-semibold", tab === value ? "border-brand text-brand" : "border-transparent text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>
      <h1 className="mt-5 mb-5 font-bold text-brand">Select Purpose</h1>
      <div className="space-y-3.5" role="radiogroup" aria-label="Purpose">
        {choices.map((c) => (
          <button key={c.value} type="button" role="radio" aria-checked={purpose === c.value} onClick={() => setPurpose(c.value)} className="flex w-full items-center gap-4 rounded-xl bg-muted/60 p-4 text-left">
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", purpose === c.value && "border-sky-600")}>
              {purpose === c.value && <span className="size-3 rounded-full bg-sky-600" />}
            </span>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-sky-600"><c.icon className="size-5" /></span>
            <span><b className="block text-sm font-semibold">{c.title}</b><span className="text-xs text-muted-foreground">{c.text}</span></span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setStep(purpose === "admission" ? "enquiry" : "form")} className={cn(primaryButton, "mt-auto")}>
        Continue
      </button>
    </Screen>
  );
}

function GeneralForm({ appointment, phone, onBack }: { appointment: boolean; phone: string; onBack: () => void }) {
  const router = useRouter();
  const options = useVisitorOptions();
  const save = useSaveVisitor();
  const upload = useUploadVisitorFile();
  const [form, setForm] = useState({ name: "", phone_number: phone, purpose: "", host: "", email: "", address: "", notes: "", party_size: 1, expected_at: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const busy = save.isPending || upload.isPending;
  const tooBig = (file: File) => {
    if (file.size <= 10 * 1024 * 1024) return false;
    toast.error("The file is larger than 10 MB.");
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const files = {
        ...(photo && { photo_key: await upload.mutateAsync({ kind: "photo", file: photo }) }),
        ...(idFile && { id_document_key: await upload.mutateAsync({ kind: "id_proof", file: idFile }), id_document_name: idFile.name }),
      };
      const saved = await save.mutateAsync({
        values: {
          ...form,
          ...files,
          host: form.host ? Number(form.host) : null,
          ...(appointment ? { expected_at: new Date(form.expected_at).toISOString() } : { expected_at: undefined, check_in: true }),
        },
      });
      router.push(appointment ? "/visitor/appointments" : `/visitor/pass/${saved.id}`);
      if (appointment) toast.success(`${saved.name} added, waiting for approval.`);
    } catch (error) {
      showError(error as Error);
    }
  };

  return (
    <Screen>
      <BackButton onClick={onBack} />
      <div className="my-5 flex flex-col items-center gap-2">
        <PhotoField name={form.name || "Visitor"} onChange={setPhoto} />
        <b className="font-semibold">{form.name || "Visitor"}</b>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-3.5">
        <Floating label="Visitor's Name" required><input required className={fieldClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Floating>
        <Floating label="Mobile Number" required><input required type="tel" className={fieldClass} value={form.phone_number} onChange={(e) => set({ phone_number: e.target.value })} /></Floating>
        <label className="relative block">
          <span className="sr-only">Meeting purpose</span>
          <select required className={cn(fieldClass, "appearance-none")} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })}>
            <option value="">Select Meeting Purpose *</option>
            {options.data?.purposes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {selectChevron}
        </label>
        <label className="relative block">
          <span className="sr-only">Meeting with</span>
          <select className={cn(fieldClass, "appearance-none")} value={form.host} onChange={(e) => set({ host: e.target.value })}>
            <option value="">Select Meeting With</option>
            {options.data?.hosts.map((h) => <option key={h.id} value={h.id}>{h.name}{h.role ? `, ${h.role}` : ""}</option>)}
          </select>
          {selectChevron}
        </label>
        {appointment && <Floating label="Date and Time" required><input required type="datetime-local" className={fieldClass} value={form.expected_at} onChange={(e) => set({ expected_at: e.target.value })} /></Floating>}
        <input aria-label="Email id" type="email" placeholder="Email id" className={fieldClass} value={form.email} onChange={(e) => set({ email: e.target.value })} />
        <input aria-label="Address" placeholder="Address" className={fieldClass} value={form.address} onChange={(e) => set({ address: e.target.value })} />
        <input aria-label="Description" placeholder="Description" className={fieldClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        <Floating label="No Of Visitors">
          <input type="number" min={1} max={50} className={fieldClass} value={form.party_size} onChange={(e) => set({ party_size: Number(e.target.value) || 1 })} />
        </Floating>
        <label className="flex h-12 cursor-pointer items-center justify-between rounded-xl border border-dashed border-brand bg-sky-50/50 px-3.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/30 dark:bg-sky-950/20">
          <span className="truncate">{idFile?.name ?? "Upload ID Proof"}</span>
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand text-brand-foreground"><UploadIcon className="size-4" /></span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && !tooBig(file)) setIdFile(file);
            }}
          />
        </label>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button type="button" onClick={onBack} className={secondaryButton}>Back</button>
          <button type="submit" disabled={busy} className={cn(primaryButton, "rounded-xl")}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            Submit
          </button>
        </div>
      </form>
    </Screen>
  );
}
