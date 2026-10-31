import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACCENT_NAMES, type Accent } from "@/lib/themes";

interface AppearanceStore {
  /** Accent each user picked, by user id; absent = their dashboard's default */
  accentByUser: Record<string, Accent>;
  sidebarCollapsed: boolean;
  setAccent: (userId: number, accent: Accent | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// ponytail: per device (localStorage). Move accentByUser to a backend preference
// if choices should follow the user across devices.
export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      accentByUser: {},
      sidebarCollapsed: false,
      setAccent: (userId, accent) =>
        set(({ accentByUser }) => {
          const next = { ...accentByUser };
          if (accent) next[userId] = accent;
          else delete next[userId];
          return { accentByUser: next };
        }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "myaisee-appearance",
      // Drop accents a later palette no longer has
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppearanceStore>;
        const accentByUser = Object.fromEntries(
          Object.entries(saved.accentByUser ?? {}).filter(([, a]) => ACCENT_NAMES.includes(a))
        );
        return { ...current, ...saved, accentByUser };
      },
    }
  )
);
