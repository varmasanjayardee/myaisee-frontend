"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Screen, TitleBar, fieldClass, primaryButton } from "./ui";

/** Point the camera at a visit pass, or type its code. Opens a visitor, or an admission family's visit. */
export function ScanPass() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const found = useRef(false);

  const open = async (text: string) => {
    const pass = text.trim().toUpperCase();
    if (!pass || found.current) return;
    found.current = true;
    setBusy(true);
    try {
      const { data } = await api.get("/admission/staff/visitors/", { params: { when: "all", q: pass, page_size: 5 } });
      const visitor = (data.results as { id: number; pass_code: string }[]).find((v) => v.pass_code === pass);
      if (visitor) return router.push(`/visitor/list/${visitor.id}`);
      // when=all: the admissions page opens on today, and this pass may be for another day
      if ((data.admission_visits as { gate_pass_code: string }[]).some((v) => v.gate_pass_code === pass)) return router.push(`/visitor/admissions?when=all&q=${encodeURIComponent(pass)}`);
      toast.error(`No visit has the code ${pass}.`);
    } catch (error) {
      toast.error((error as Error).message);
    }
    found.current = false;
    setBusy(false);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");

    const tick = () => {
      const el = video.current;
      if (stopped || !el) return;
      if (el.readyState === el.HAVE_ENOUGH_DATA && !found.current) {
        canvas.width = el.videoWidth;
        canvas.height = el.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(el, 0, 0);
          const hit = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
          if (hit?.data) void open(hit.data);
        }
      }
      frame = requestAnimationFrame(tick);
    };

    // No mediaDevices at all on a page that isn't https: the same message covers it
    Promise.resolve()
      .then(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }))
      .then((s) => {
        stream = s;
        if (stopped || !video.current) return s.getTracks().forEach((t) => t.stop());
        video.current.srcObject = s;
        void video.current.play();
        tick();
      })
      .catch(() => setCameraError("The camera isn't available. Allow camera access on an https page, or type the code below."));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- starts once; `open` only reads refs and the router
  }, []);

  return (
    <Screen>
      <TitleBar title="Scan QR" back="/visitor" />
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
        <video ref={video} playsInline muted className="size-full object-cover" />
        {cameraError && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{cameraError}</p>}
        {!cameraError && <span aria-hidden className="absolute inset-[18%] rounded-2xl border-2 border-white/80" />}
      </div>
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void open(code);
        }}
      >
        <input aria-label="Gate pass code" placeholder="Or type the pass code" autoComplete="off" maxLength={6} className={`${fieldClass} text-center font-mono tracking-widest uppercase`} value={code} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} />
        <button type="submit" disabled={busy || !code} className={primaryButton}>
          {busy && <Loader2Icon className="size-4 animate-spin" />}
          Find visit
        </button>
      </form>
    </Screen>
  );
}
