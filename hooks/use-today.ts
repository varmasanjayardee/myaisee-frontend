"use client";

import { useSyncExternalStore } from "react";

// The clock is "runtime data" under Cache Components: reading it while prerendering
// would freeze it into the static page. These give null on the server and the real
// value in the browser. Strings/numbers, so React sees a stable snapshot.
const subscribe = () => () => {};
const pad = (n: number) => String(n).padStart(2, "0");

/** Today as yyyy-MM-dd in the browser's time zone; null while prerendering */
export function useToday() {
  return useSyncExternalStore(
    subscribe,
    () => {
      const d = new Date();
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    () => null
  );
}

/** The current hour, 0–23; null while prerendering */
export function useHour() {
  return useSyncExternalStore(subscribe, () => new Date().getHours(), () => null);
}
