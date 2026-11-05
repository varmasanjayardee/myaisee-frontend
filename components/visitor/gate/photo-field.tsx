"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, RefreshCwIcon, UploadIcon, UserRoundIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { PersonPhoto } from "./ui";

const MAX_BYTES = 10 * 1024 * 1024;

/** The visitor's photo: taken with the device's camera, or uploaded from a file. Optional. */
export function PhotoField({ name, savedSrc, onChange }: { name: string; savedSrc?: string | null; onChange: (file: File | null) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [preview, setPreview] = useState<string | null>(null);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => stopCamera, []);

  const choose = (file: File | null) => {
    setPreview(file ? URL.createObjectURL(file) : null);
    onChange(file);
  };

  const startCamera = async (mode: "user" | "environment") => {
    stopCamera();
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      setFacing(mode);
      setCameraOpen(true);
      if (video.current) video.current.srcObject = stream.current;
    } catch {
      setCameraOpen(false);
      toast.error("The camera isn't available. Allow camera access on an https page, or upload a photo.");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const capture = () => {
    const el = video.current;
    if (!el?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext("2d")?.drawImage(el, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      choose(new File([blob], "visitor-photo.jpg", { type: "image/jpeg" }));
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  if (cameraOpen) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-56 overflow-hidden rounded-full border-2 border-dashed border-sky-400 bg-black">
          <video
            ref={(el) => {
              video.current = el;
              if (el && stream.current && el.srcObject !== stream.current) el.srcObject = stream.current;
            }}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
            style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Close the camera" onClick={closeCamera} className="grid size-10 place-items-center rounded-full border"><XIcon className="size-4" /></button>
          <button type="button" onClick={capture} className="flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"><CameraIcon className="size-4" />Capture</button>
          <button type="button" aria-label="Switch camera" onClick={() => startCamera(facing === "user" ? "environment" : "user")} className="grid size-10 place-items-center rounded-full border"><RefreshCwIcon className="size-4" /></button>
        </div>
      </div>
    );
  }

  const shown = preview ?? savedSrc;
  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="rounded-full border-2 border-dashed border-sky-400 p-1">
        {shown ? (
          <PersonPhoto name={name} src={shown} size={84} />
        ) : (
          <span className="grid size-21 place-items-center rounded-full bg-muted text-muted-foreground"><UserRoundIcon className="size-8" /></span>
        )}
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => startCamera(facing)} className="flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors hover:bg-muted">
          <CameraIcon className="size-3.5" />{shown ? "Retake" : "Take photo"}
        </button>
        <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/30">
          <UploadIcon className="size-3.5" />Upload
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > MAX_BYTES) toast.error("The file is larger than 10 MB.");
              else choose(file);
            }}
          />
        </label>
        {preview && (
          <button type="button" onClick={() => choose(null)} className="flex h-9 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:text-destructive">
            <XIcon className="size-3.5" />Remove
          </button>
        )}
      </div>
    </div>
  );
}
