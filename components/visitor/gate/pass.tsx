"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { DownloadIcon, HomeIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { downloadVisitorPass, useVisitorPass } from "@/services/visitor.service";
import { PersonPhoto, ScreenSkeleton, Screen } from "./ui";

/** The visit pass the visitor shows: photo, QR code and the visit's details */
export function VisitPass({ id }: { id: number }) {
  const pass = useVisitorPass(id);
  const [saving, setSaving] = useState(false);
  const v = pass.data;

  if (pass.isLoading) return <Screen><ScreenSkeleton rows={5} /></Screen>;
  if (!v) return <Screen><p className="m-auto text-sm text-muted-foreground">{pass.error?.message ?? "This pass didn't load."}</p></Screen>;

  const logo = /goa/i.test(v.campus_name) ? "/visitor/logo-goa.png" : /nfc|delhi/i.test(v.campus_name) ? "/visitor/logo-new-delhi.png" : null;
  const rows = [
    ["Visitor ID No.", `${v.pass_code}-${v.id}`],
    ["Visitor Pass No.", v.pass_code],
    ["Purpose", v.purpose_label],
    ["Meeting With", v.host_name || "Not set"],
    ["Date & Time", format(parseISO(v.checked_in_at ?? v.expected_at), "dd MMM yyyy, h:mm a")],
  ];

  const save = () => {
    setSaving(true);
    downloadVisitorPass(v.id, v.pass_code)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setSaving(false));
  };

  return (
    <Screen className="justify-center">
      <section className="overflow-hidden rounded-xl border bg-card shadow-md">
        <svg viewBox="0 0 400 56" preserveAspectRatio="none" className="block h-14 w-full" aria-hidden>
          <rect width="400" height="56" fill="var(--brand)" />
          <path d="M0 42 C100 22 200 34 400 30 V56 H0 Z" fill="#1b8fd0" />
          <path d="M0 52 C100 32 200 44 400 36 V56 H0 Z" fill="var(--card)" />
        </svg>
        <div className="flex flex-col items-center px-5 pb-5">
          {logo && <Image src={logo} alt="" width={180} height={44} />}
          <p className="mt-1 mb-3 font-semibold text-brand">{v.campus_name.trim()}</p>
          <span className="rounded-full border-4 border-background shadow"><PersonPhoto name={v.name} src={v.photo_url} size={84} /></span>
          <b className="mt-2 mb-3 text-lg font-semibold">{v.name}</b>
          {/* eslint-disable-next-line @next/next/no-img-element -- the backend's SVG data URI */}
          <img src={v.qr} alt={`QR code for pass ${v.pass_code}`} className="size-32 rounded-lg border bg-white p-1.5" />
          <dl className="mt-4 w-full space-y-1.5 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold">: {value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="h-4 bg-brand" />
      </section>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link href="/visitor" className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand/80 text-xs font-bold tracking-wide text-brand-foreground uppercase">
          <HomeIcon className="size-4" />Home
        </Link>
        <button type="button" disabled={saving} onClick={save} className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand text-xs font-bold tracking-wide text-brand-foreground uppercase disabled:opacity-50">
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
          Download
        </button>
      </div>
    </Screen>
  );
}
