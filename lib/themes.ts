import type { Dashboard } from "@/lib/roles";

/**
 * Accent palette for the dashboards, after Keyed-frontend's per-role preferences
 * (src/lib/{student,guardian,mentor,coordinator}-preferences.ts): each role has its
 * signature colour plus the shared Crimson, Ocean, Orchid and Harbor. `hover` is the
 * base darkened like Keyed's ACCENT_DARKEN; `soft` is the palette's lightest shade.
 *
 * The shell writes the chosen accent into CSS variables (--brand, --brand-hover,
 * --brand-soft, and --primary/--ring so buttons follow); Tailwind reads them as
 * `bg-brand`, `text-brand`, `hover:bg-brand-hover`, `bg-brand-soft` (app/globals.css).
 * Nothing else hard-codes a role colour.
 */

function darken(hex: string, amount: number) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 255) * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
}

const accent = (label: string, base: string, soft: string, darkenBy = 0.2) => ({
  label,
  brand: base,
  hover: darken(base, darkenBy),
  soft,
});

export const ACCENTS = {
  // Role signatures (Keyed-frontend)
  indigo: accent("Indigo", "#6366F1", "#E5E5FD"),
  forest: accent("Forest", "#005A21", "#CDE0D4"),
  sky: accent("Sky", "#0EA5E9", "#BBEDFF"),
  amber: accent("Amber", "#E8620A", "#FBE0CC"),
  // Shared by every role with a choice (Keyed-frontend)
  crimson: accent("Crimson", "#982823", "#EEDBDA"),
  ocean: accent("Ocean", "#174365", "#D8E0E5"),
  orchid: accent("Orchid", "#E88AE3", "#FBEBFA", 0.35),
  harbor: accent("Harbor", "#566269", "#D5D8D9", 0),
  // Fixed in Keyed-frontend (admin indigo-600, finance teal); no choice offered
  royal: { label: "Royal", brand: "#4F46E5", hover: "#4338CA", soft: "#E0E7FF" },
  teal: { label: "Teal", brand: "#0F766E", hover: "#0D6E66", soft: "#CCFBF1" },
  // MyAISee-only roles
  gold: accent("Gold", "#D97706", "#FEF3C7"),
  rose: accent("Rose", "#E11D48", "#FFE4E6"),
  violet: accent("Violet", "#7C3AED", "#EDE9FE"),
} as const;

export type Accent = keyof typeof ACCENTS;

export const ACCENT_NAMES = Object.keys(ACCENTS) as Accent[];

const SHARED: Accent[] = ["crimson", "ocean", "orchid", "harbor"];

/** What each dashboard may pick from; the first is its default */
export const ROLE_ACCENTS: Record<Dashboard, Accent[]> = {
  student: ["indigo", ...SHARED],
  guardian: ["forest", ...SHARED],
  mentor: ["sky", ...SHARED],
  coordinator: ["amber", ...SHARED],
  admin: ["royal"],
  finance: ["teal"],
  transport: ["gold", ...SHARED],
  admission: ["rose", ...SHARED],
  // Ocean is the gate app's navy, so it comes first
  visitor: ["ocean", "violet", "crimson", "orchid", "harbor"],
};

/** The user's pick if this dashboard offers it, else the dashboard's default */
export function resolveAccent(dashboard: Dashboard, chosen?: Accent): Accent {
  const options = ROLE_ACCENTS[dashboard];
  return chosen && options.includes(chosen) ? chosen : options[0];
}

/**
 * The accent as a :root rule. Set on the root, not a wrapper, because the mobile
 * drawer and dropdowns render in portals outside the shell and must match too.
 */
export function accentCss(name: Accent) {
  const { brand, hover, soft } = ACCENTS[name];
  // Dark (Material dark theme): the brand's desaturated 200-ish tone for accents, black
  // text on it, a soft tint instead of a pastel fill, and the sidebar as #121212 tinted
  // 8% with the brand: a branded dark surface, never a bright slab. :root.dark outranks
  // the plain :root rule above and the .dark tokens in globals.css.
  const tone = (l: number) => `oklch(from ${brand} ${l} min(c, 0.09) h)`;
  return (
    `:root{--brand:${brand};--brand-hover:${hover};--brand-soft:${soft};--brand-foreground:#FFFFFF;--primary:${brand};--ring:${brand};` +
    `--sidebar:${brand};--sidebar-foreground:#FFFFFF;--sidebar-primary:#FFFFFF;--sidebar-primary-foreground:${brand};--sidebar-ring:${brand}}` +
    `:root.dark{--brand:${tone(0.82)};--brand-hover:${tone(0.74)};--brand-soft:color-mix(in srgb,${brand} 16%,var(--surface));--brand-foreground:rgb(0 0 0/0.87);` +
    `--primary:var(--brand);--ring:var(--brand);--sidebar:color-mix(in srgb,${brand} 8%,var(--surface));--sidebar-foreground:rgb(255 255 255/0.87);` +
    `--sidebar-primary:var(--brand);--sidebar-primary-foreground:rgb(0 0 0/0.87);--sidebar-ring:var(--brand)}`
  );
}
