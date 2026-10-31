"use client";

import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, PaletteIcon, RotateCcwIcon, SunIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dashboard } from "@/lib/roles";
import { ACCENTS, ROLE_ACCENTS, type Accent } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useAppearanceStore } from "@/store/appearance.store";

const MODES = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

/** Sidebar footer control: the user's accent color (from their role's set) and theme mode */
export function AppearanceMenu({
  userId,
  dashboard,
  accent,
  collapsed,
}: {
  userId: number;
  dashboard: Dashboard;
  accent: Accent;
  collapsed: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const setAccent = useAppearanceStore((s) => s.setAccent);
  const options = ROLE_ACCENTS[dashboard];
  const roleDefault = options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Appearance"
        className={cn(
          "flex items-center gap-2 rounded-full text-sm font-medium text-sidebar-foreground/85 outline-none transition-colors hover:bg-white/10 dark:hover:bg-white/[0.04] hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-white/70",
          collapsed ? "mx-auto size-10 justify-center" : "w-full px-3 py-2.5"
        )}
      >
        <PaletteIcon className="size-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Appearance</span>
            <span aria-hidden className="size-3.5 rounded-full ring-2 ring-white/80" style={{ background: ACCENTS[accent].brand }} />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" className="w-60">
        {/* Admin and finance have one fixed colour, as in Keyed-frontend */}
        {options.length > 1 && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Accent color</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={accent} onValueChange={(value) => setAccent(userId, value as Accent)}>
                {options.map((name) => (
                  <DropdownMenuRadioItem key={name} value={name} className="gap-2.5">
                    <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ background: ACCENTS[name].brand }} />
                    {ACCENTS[name].label}
                    {name === roleDefault && <span className="ml-auto pr-5 text-xs text-muted-foreground">Default</span>}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {accent !== roleDefault && (
                <DropdownMenuItem onClick={() => setAccent(userId, null)}>
                  <RotateCcwIcon />
                  Back to {ACCENTS[roleDefault].label}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(value) => setTheme(value as string)}>
            {MODES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
