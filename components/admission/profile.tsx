"use client";

import Link from "next/link";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { useTheme } from "next-themes";
import {
  AlertTriangleIcon,
  CalendarCheckIcon,
  CheckIcon,
  ChevronRightIcon,
  KeyRoundIcon,
  Loader2Icon,
  LogOutIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  NotebookPenIcon,
  PhoneIcon,
  ReceiptIndianRupeeIcon,
  ScaleIcon,
  SunIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, getInitials, STEPS } from "@/lib/admission";
import { ACCENTS, resolveAccent, ROLE_ACCENTS } from "@/lib/themes";
import { useLogout, useMe } from "@/services/auth.service";
import { useStaffProfile } from "@/services/admission.service";
import { useAppearanceStore } from "@/store/appearance.store";
import { Card, EmptyState, SkeletonRows } from "./ui";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The counsellor's own page: who they are, the work they've done, and their account */
export function StaffProfileView() {
  const profile = useStaffProfile();

  if (profile.isLoading) return <SkeletonRows rows={8} columns={2} />;
  if (!profile.data)
    return (
      <EmptyState icon={AlertTriangleIcon} title="Your profile didn't load">
        {profile.error?.message}
      </EmptyState>
    );

  const p = profile.data;
  const w = p.work;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/admission" className="hover:text-foreground">
          Desk
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">Profile</span>
      </nav>

      <Card>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          {p.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned storage URL
            <img src={p.photo} alt="" className="size-20 shrink-0 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">
              {getInitials(p.name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            <p className="mt-1 text-muted-foreground">{[p.role, p.designation, p.campus].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              {p.employee_id && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  <KeyRoundIcon className="size-3.5" />
                  Staff ID {p.employee_id}
                </span>
              )}
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{plural(w.active_families, "active family", "active families")}</span>
              {w.enrolled > 0 && <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{w.enrolled} enrolled</span>}
            </div>
          </div>
        </div>
      </Card>

      <Section title="Your work">
        <Row
          icon={UsersIcon}
          title="Families"
          detail={`${w.active_families} active, ${w.closed} closed · ${plural(w.active_applications, "application")} in the journey`}
          href="/admission/applications"
        />
        <Row icon={UserPlusIcon} title="Enquiries" detail={w.enquiries_added ? `${plural(w.enquiries_added, "enquiry", "enquiries")} you added` : "Calls, walk-ins and events you capture"} href="/admission/leads" />
        <Row
          icon={CalendarCheckIcon}
          title="Campus visits"
          detail={`${w.visits_upcoming} coming up with you, ${w.visits_hosted} hosted`}
          href="/admission/visits"
        />
        <Row icon={ScaleIcon} title="Decisions" detail={w.decisions ? `${plural(w.decisions, "decision")} made by you` : "Families waiting after their visit"} href="/admission/applications?step=5" />
        <Row
          icon={ReceiptIndianRupeeIcon}
          title="Payments at the desk"
          detail={w.payments_received ? `${plural(w.payments_received, "payment")} received, ${formatCurrency(w.payments_total)} in all` : "None recorded by you yet"}
        />
        <Row icon={NotebookPenIcon} title="Notes" detail={w.notes ? `${plural(w.notes, "note")} logged on enquiries` : "Log calls and visits on an enquiry"} />
      </Section>

      {p.recent.length > 0 && (
        <Section title="Recent activity">
          {p.recent.map((r) => {
            const Icon = STEPS[r.step - 1]?.icon ?? CheckIcon;
            return (
              <Row
                key={`${r.child_id}-${r.step}-${r.at}`}
                icon={Icon}
                title={r.child}
                detail={`${r.label} done ${formatDistanceToNowStrict(parseISO(r.at), { addSuffix: true })}`}
                href={`/admission/applications/${r.child_id}`}
              />
            );
          })}
        </Section>
      )}

      <Section title="Account">
        <Row icon={MailIcon} title="Email" detail={p.email} />
        {p.phone && <Row icon={PhoneIcon} title="Phone" detail={p.phone} />}
        <Appearance />
        <SignOut />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
      <Card>
        <ul className="divide-y">{children}</ul>
      </Card>
    </section>
  );
}

function Row({ icon: Icon, title, detail, href }: { icon: LucideIcon; title: string; detail: string; href?: string }) {
  const body = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{detail}</span>
      </span>
      {href && <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="group flex items-center gap-4 px-5 py-4 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-4 px-5 py-4">{body}</div>
      )}
    </li>
  );
}

const THEMES = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

/** Theme and accent, the same choices as the sidebar's appearance menu */
function Appearance() {
  const { theme, setTheme } = useTheme();
  const me = useMe();
  const chosen = useAppearanceStore((s) => (me.data ? s.accentByUser[me.data.id] : undefined));
  const setAccent = useAppearanceStore((s) => s.setAccent);
  const options = ROLE_ACCENTS.admission;
  const accent = resolveAccent("admission", chosen);

  return (
    <li className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
      <span className="flex flex-1 items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <SunIcon className="size-5" />
        </span>
        <span>
          <span className="block font-semibold">Appearance</span>
          <span className="block text-sm text-muted-foreground">Theme and accent, on this device</span>
        </span>
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Theme" className="flex rounded-full border p-0.5">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              onClick={() => setTheme(t.value)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors aria-checked:bg-brand aria-checked:text-brand-foreground"
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        {me.data && options.length > 1 && (
          <div role="radiogroup" aria-label="Accent" className="flex gap-1.5">
            {options.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={accent === name}
                aria-label={ACCENTS[name].label}
                title={ACCENTS[name].label}
                onClick={() => setAccent(me.data.id, name === options[0] ? null : name)}
                className="flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground/40"
                style={{ background: ACCENTS[name].brand }}
              >
                {accent === name && <CheckIcon className="size-3.5 text-white" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function SignOut() {
  const logout = useLogout();
  return (
    <li>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="flex w-full items-center gap-4 px-5 py-4 text-left text-red-600 outline-none transition-colors hover:bg-red-50 focus-visible:bg-red-50 disabled:opacity-38 dark:hover:bg-white/[0.04]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-white/[0.08]">
          {logout.isPending ? <Loader2Icon className="size-5 animate-spin" /> : <LogOutIcon className="size-5" />}
        </span>
        <span className="font-semibold">{logout.isPending ? "Signing out…" : "Sign out"}</span>
      </button>
    </li>
  );
}
