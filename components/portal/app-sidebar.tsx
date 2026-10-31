"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, LockKeyholeIcon, LogOutIcon, SearchIcon, XIcon } from "lucide-react";
import { isActive, isHeading, type NavEntry, type NavLink } from "@/lib/nav";
import { dashboardHref, roleLabel, type Dashboard } from "@/lib/roles";
import type { Accent } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { Me } from "@/schemas/auth.schema";
import { AppearanceMenu } from "./appearance-menu";

interface AppSidebarProps {
  dashboard: Dashboard;
  nav: NavEntry[];
  me: Me;
  accent: Accent;
  collapsed: boolean;
  /** Desktop only; the mobile drawer has no collapse */
  onToggleCollapse?: () => void;
  onExpand?: () => void;
  /** Mobile drawer closes on navigation */
  onNavigate?: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

/**
 * The dashboard sidebar, after Keyed-frontend's NavigationSidebar: painted in the
 * user's accent (bg-sidebar: the brand in light, a brand-tinted dark surface in dark), a pill for the active page, menu search, headings,
 * animated submenus, Beta and locked "coming soon" items, collapsible to icons.
 */
export function AppSidebar({
  dashboard,
  nav,
  me,
  accent,
  collapsed,
  onToggleCollapse,
  onExpand,
  onNavigate,
  onLogout,
  loggingOut,
}: AppSidebarProps) {
  const pathname = usePathname();
  const home = dashboardHref(dashboard);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const links = nav.filter((entry): entry is NavLink => !isHeading(entry));
  const activeParent =
    links.find((link) => link.submenu?.some((sub) => isActive(pathname, sub.href, home)))?.name ?? null;

  // The open submenu follows the page (its parent opens on its routes) until the user
  // toggles one; a toggle only holds for the page it was made on, so no effects needed.
  const [toggled, setToggled] = useState<{ path: string; name: string | null } | null>(null);
  const openName = toggled?.path === pathname ? toggled.name : activeParent;
  const toggle = (name: string) => setToggled({ path: pathname, name: openName === name ? null : name });

  // Search keeps a heading only if something under it matches; a parent stays if it or
  // any of its submenu matches (all its submenu when the parent itself matches)
  const visible = useMemo(() => {
    if (!q) return collapsed ? nav.filter((entry) => !isHeading(entry)) : nav;
    const out: NavEntry[] = [];
    let heading: NavEntry | null = null;
    let group: NavEntry[] = [];
    const flush = () => {
      if (group.length) out.push(...(heading && !collapsed ? [heading] : []), ...group);
      heading = null;
      group = [];
    };
    for (const entry of nav) {
      if (isHeading(entry)) {
        flush();
        heading = entry;
        continue;
      }
      const hit = entry.name.toLowerCase().includes(q);
      const subHits = entry.submenu?.filter((sub) => sub.name.toLowerCase().includes(q)) ?? [];
      if (hit || subHits.length) group.push(entry.submenu ? { ...entry, submenu: hit ? entry.submenu : subHits } : entry);
    }
    flush();
    return out;
  }, [nav, q, collapsed]);

  const row = (active: boolean, disabled?: boolean) =>
    cn(
      "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70",
      collapsed
        ? "mx-auto flex size-10 items-center justify-center rounded-full"
        : "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold",
      disabled
        ? "cursor-not-allowed opacity-40 select-none"
        : active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-white/10 dark:hover:bg-white/[0.04]"
    );

  return (
    <div className="relative flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-3 -right-3.5 z-10 flex size-7 items-center justify-center rounded-full bg-sidebar text-sidebar-foreground shadow-md ring-2 ring-background transition-colors hover:bg-[color-mix(in_srgb,var(--sidebar),white_12%)] focus-visible:ring-white/70 focus-visible:outline-none"
        >
          {collapsed ? <ChevronsRightIcon className="size-4" /> : <ChevronsLeftIcon className="size-4" />}
        </button>
      )}

      {/* Wordmark */}
      <Link
        href={home}
        onClick={onNavigate}
        className={cn("flex items-center gap-2.5 pt-6 pb-5 outline-none", collapsed ? "justify-center px-0" : "px-5")}
        aria-label="MyAISee home"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-base font-black text-sidebar-primary-foreground">M</span>
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight">MyAISee</span>
            <span className="block text-xs text-sidebar-foreground/70">Runs on Atlas</span>
          </span>
        )}
      </Link>

      <ProfileCard me={me} collapsed={collapsed} href={PROFILE_PAGES[dashboard]} onNavigate={onNavigate} />

      {!collapsed && (
        <div className="relative mx-3 mb-3">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sidebar-foreground/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu"
            aria-label="Search the menu"
            className="h-10 w-full rounded-lg border border-white/15 bg-white/5 pr-9 pl-10 text-sm text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/60 focus:border-white/40 focus:bg-white/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
        {visible.map((entry, i) =>
          isHeading(entry) ? (
            <p key={`h-${entry.heading}-${i}`} className="px-3 pt-4 pb-1 text-xs font-semibold text-sidebar-foreground/60 select-none">
              {entry.heading}
            </p>
          ) : (
            <NavRow
              key={`${entry.name}-${i}`}
              link={entry}
              pathname={pathname}
              home={home}
              collapsed={collapsed}
              open={!collapsed && (!!q || openName === entry.name)}
              rowClass={row}
              // A parent only opens its submenu. (Keyed-frontend also navigates to the
              // parent's own href, which closed the menu on the first click here.)
              onToggle={() => {
                if (collapsed) {
                  setToggled({ path: pathname, name: entry.name });
                  onExpand?.();
                } else toggle(entry.name);
              }}
              onNavigate={() => {
                if (collapsed) onExpand?.();
                onNavigate?.();
              }}
            />
          )
        )}
        {q && !visible.length && <p className="px-3 py-4 text-sm text-sidebar-foreground/70">Nothing matches &ldquo;{query}&rdquo;.</p>}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/15 px-3 py-3">
        <AppearanceMenu userId={me.id} dashboard={dashboard} accent={accent} collapsed={collapsed} />
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          aria-label={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full bg-white text-sm font-semibold text-red-600 transition-colors outline-none hover:bg-red-50 dark:bg-white/[0.12] dark:hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-38",
            collapsed ? "mx-auto size-10 justify-center" : "w-full px-3 py-2.5"
          )}
        >
          <LogOutIcon className="size-4 shrink-0" />
          {!collapsed && (loggingOut ? "Signing out…" : "Sign out")}
        </button>
      </div>
    </div>
  );
}

function NavRow({
  link,
  pathname,
  home,
  collapsed,
  open,
  rowClass,
  onToggle,
  onNavigate,
}: {
  link: NavLink;
  pathname: string;
  home: string;
  collapsed: boolean;
  open: boolean;
  rowClass: (active: boolean, disabled?: boolean) => string;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const panelId = useId();
  const Icon = link.icon;
  const active = link.submenu
    ? link.submenu.some((sub) => isActive(pathname, sub.href, home))
    : isActive(pathname, link.href, home);
  const label = !collapsed && <span className="min-w-0 flex-1 truncate text-left">{link.name}</span>;
  const badges = !collapsed && (
    <>
      {link.beta && <BetaBadge />}
      {link.disabled && <Locked soon={link.soon} />}
    </>
  );

  if (link.disabled) {
    return (
      <span className={rowClass(false, true)} aria-disabled title={`${link.name}: coming soon`}>
        <Icon className="size-5 shrink-0" />
        {label}
        {badges}
      </span>
    );
  }

  if (!link.submenu) {
    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? link.name : undefined}
        title={collapsed ? link.name : undefined}
        className={rowClass(active)}
      >
        <Icon className="size-5 shrink-0" />
        {label}
        {badges}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={collapsed ? link.name : undefined}
        title={collapsed ? link.name : undefined}
        className={rowClass(active && !collapsed)}
      >
        <Icon className="size-5 shrink-0" />
        {label}
        {badges}
        {!collapsed && <ChevronRightIcon className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-90")} />}
      </button>

      {/* Always mounted; grid rows 0fr -> 1fr animates the height without measuring */}
      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        inert={!open}
      >
        <ul className={cn("min-h-0 space-y-1 overflow-hidden pl-6 transition-opacity duration-200", open ? "mt-1 opacity-100" : "opacity-0")}>
          {link.submenu.map((sub) => {
            const subActive = isActive(pathname, sub.href, home);
            return (
              <li key={`${sub.name}-${sub.href}`}>
                {sub.disabled ? (
                  <span className="flex cursor-not-allowed items-center gap-2 rounded-full px-3 py-2 text-sm font-medium opacity-40 select-none" aria-disabled>
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
                    <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                    <Locked soon={sub.soon} />
                  </span>
                ) : (
                  <Link
                    href={sub.href}
                    onClick={onNavigate}
                    aria-current={subActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70",
                      subActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/85 hover:bg-white/10 dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />
                    <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                    {sub.beta && <BetaBadge />}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Who's signed in; /me/ has no name, so the role stands in */
/** Dashboards with a profile page; the card's arrow opens it */
const PROFILE_PAGES: Partial<Record<Dashboard, string>> = { admission: "/admission/settings" };

function ProfileCard({ me, collapsed, href, onNavigate }: { me: Me; collapsed: boolean; href?: string; onNavigate?: () => void }) {
  const label = roleLabel(me);
  const initials = label
    .split(/[\s·]+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (collapsed) {
    const avatar = "mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold";
    return href ? (
      <Link href={href} onClick={onNavigate} aria-label="Your profile" title={label} className={cn(avatar, "outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/70")}>
        {initials}
      </Link>
    ) : (
      <span className={avatar} title={label}>
        {initials}
      </span>
    );
  }

  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-full bg-white/15 px-3 py-2.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">{initials}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className="block truncate text-xs text-sidebar-foreground/70">Signed in</span>
      </span>
      {href && (
        <Link
          href={href}
          onClick={onNavigate}
          aria-label="Your profile"
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 outline-none transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      )}
    </div>
  );
}

function BetaBadge() {
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
      Beta
    </span>
  );
}

function Locked({ soon }: { soon?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold" title={soon === "Ad-on" ? "Add-on" : "Coming soon"}>
      <LockKeyholeIcon className="size-3.5" />
      {soon === "Ad-on" ? "Add-on" : soon ? "Soon" : null}
    </span>
  );
}
