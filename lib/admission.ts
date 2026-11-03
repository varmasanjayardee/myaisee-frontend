// The admission journey as the counsellor sees it. Step numbers match keyed-backend
// admission/models.py AdmissionStep; outcomes match AdmissionLeadChild.Outcome.

import {
  BadgeCheckIcon,
  CalendarPlusIcon,
  FileTextIcon,
  KeyRoundIcon,
  ListChecksIcon,
  MailOpenIcon,
  MapPinnedIcon,
  PencilLineIcon,
  ReceiptIndianRupeeIcon,
  ScaleIcon,
  WalletIcon,
} from "lucide-react";

export const STEPS = [
  { step: 1, label: "Application", short: "Apply", icon: FileTextIcon },
  { step: 2, label: "Registration fee", short: "Reg. fee", icon: ReceiptIndianRupeeIcon },
  { step: 3, label: "Slot booking", short: "Book", icon: CalendarPlusIcon },
  { step: 4, label: "Visit day", short: "Visit", icon: MapPinnedIcon },
  { step: 5, label: "Aptitude test", short: "Test", icon: PencilLineIcon },
  { step: 6, label: "Under review", short: "Review", icon: ScaleIcon },
  { step: 7, label: "Accept offer", short: "Offer", icon: MailOpenIcon },
  { step: 8, label: "Admission fee", short: "Adm. fee", icon: WalletIcon },
  { step: 9, label: "Before joining", short: "Joining", icon: ListChecksIcon },
  { step: 10, label: "Account setup", short: "Accounts", icon: KeyRoundIcon },
  { step: 11, label: "Account ready", short: "Ready", icon: BadgeCheckIcon },
] as const;

/** The journey's three stretches, as the desk groups them */
export const PHASES = [
  { label: "Applying", steps: [1, 2, 3] },
  { label: "Visit and decision", steps: [4, 5, 6, 7] },
  { label: "Joining", steps: [8, 9, 10, 11] },
] as const;

export const TOTAL_STEPS = STEPS.length;

export const stepLabel = (step: number) => (step > TOTAL_STEPS ? "Enrolled" : (STEPS[step - 1]?.label ?? `Step ${step}`));

export type Outcome = "pending" | "waitlisted" | "offered" | "rejected" | "not_offered" | "declined" | "withdrawn";

export const OUTCOMES: Record<Outcome, { label: string; tone: "neutral" | "info" | "good" | "bad" | "warn" }> = {
  pending: { label: "In progress", tone: "neutral" },
  waitlisted: { label: "Waiting list", tone: "info" },
  offered: { label: "Offered", tone: "good" },
  rejected: { label: "Rejected", tone: "bad" },
  not_offered: { label: "Not offered", tone: "warn" },
  declined: { label: "Declined offer", tone: "bad" },
  withdrawn: { label: "Offer lapsed", tone: "warn" },
};

/** The journey stopped here: no further steps will happen */
export const isClosed = (outcome: Outcome) => ["rejected", "not_offered", "declined", "withdrawn"].includes(outcome);

export const TONE_CLASS = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  good: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  bad: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  warn: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
} as const;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatCurrency = (amount: string | number) => inr.format(Number(amount));

/** "Aarav Sharma" -> "AS" */
export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
