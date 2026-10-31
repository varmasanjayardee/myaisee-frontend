"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, MenuIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { errorStatus } from "@/lib/api";
import { navFor } from "@/lib/nav";
import { DASHBOARDS, dashboardHref, resolveDashboard, roleLabel, type Dashboard } from "@/lib/roles";
import { accentCss, resolveAccent } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useLogout, useMe } from "@/services/auth.service";
import { useAppearanceStore } from "@/store/appearance.store";
import { AppSidebar } from "./app-sidebar";

/**
 * Wraps every page in a dashboard folder: checks the session, sends users to their
 * own dashboard, and renders that dashboard's sidebar in the user's accent.
 * ponytail: client-side guard is UX only; the backend's role_permission is the real check
 */
export function RoleShell({ dashboard, children }: { dashboard: Dashboard; children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const collapsed = useAppearanceStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppearanceStore((s) => s.setSidebarCollapsed);
  const chosenAccent = useAppearanceStore((s) => (me.data ? s.accentByUser[me.data.id] : undefined));
  // A pick this dashboard doesn't offer (e.g. made on another role) falls back to its default
  const accent = resolveAccent(dashboard, chosenAccent);

  const signedOut = [401, 403].includes(errorStatus(me.error) ?? 0);
  const own = me.data ? resolveDashboard(me.data) : null;
  const redirectTo = signedOut ? "/login" : me.data && own !== dashboard ? (own ? dashboardHref(own) : "/login") : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // The page segment always renders (Next's instant-navigation validation needs it);
  // it stays hidden until the session check passes. The backend is the real guard.
  const ready = !!me.data && !redirectTo;
  const unreachable = me.isError && !signedOut;
  const { title } = DASHBOARDS[dashboard];
  const sidebar = me.data && {
    dashboard,
    nav: navFor(dashboard, me.data),
    me: me.data,
    accent,
    onLogout: () => logout.mutate(),
    loggingOut: logout.isPending,
  };

  return (
    <div data-dashboard={dashboard} className="min-h-dvh bg-background">
      {/* The user's accent as CSS variables: the sidebar (bg-sidebar), drawers and buttons (--primary) */}
      <style>{accentCss(accent)}</style>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:flex",
          collapsed ? "w-18" : "w-68"
        )}
      >
        {ready && sidebar ? (
          <AppSidebar
            {...sidebar}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            onExpand={() => setCollapsed(false)}
          />
        ) : (
          <SidebarSkeleton collapsed={collapsed} />
        )}
      </aside>

      {ready && sidebar && (
        <Drawer open={menuOpen} onOpenChange={setMenuOpen} swipeDirection="left">
          <DrawerContent className="border-0 bg-sidebar p-0 data-[swipe-axis=x]:[--drawer-content-width:min(20rem,85vw)]">
            <DrawerTitle className="sr-only">{title} menu</DrawerTitle>
            <AppSidebar {...sidebar} collapsed={false} onNavigate={() => setMenuOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}

      <div className={cn("flex min-h-dvh flex-col transition-[margin] duration-300 ease-in-out motion-reduce:transition-none", collapsed ? "lg:ml-18" : "lg:ml-68")}>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} disabled={!ready} aria-label="Open menu">
            <MenuIcon />
          </Button>
          <p className="font-semibold lg:hidden">MyAISee</p>
          {me.data && (
            <Badge variant="secondary" className="ml-auto">
              {roleLabel(me.data)}
            </Badge>
          )}
        </header>

        {unreachable ? (
          <div className="m-auto flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-medium">Couldn&apos;t reach the server.</p>
            <Button variant="outline" onClick={() => me.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          !ready && <Loader2Icon className="m-auto size-6 animate-spin text-muted-foreground" aria-label="Loading" />
        )}
        <main hidden={!ready} className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** The sidebar's shape in the role's colour while the session loads */
function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div aria-hidden className="flex h-full w-full flex-col gap-3 bg-sidebar px-3 pt-6">
      <span className={cn("h-9 rounded-xl bg-white/20", collapsed ? "mx-auto w-9" : "w-36")} />
      <span className={cn("mt-2 h-14 rounded-full bg-white/15", collapsed && "mx-auto w-10")} />
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={cn("h-9 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none", collapsed && "mx-auto w-10")} />
      ))}
    </div>
  );
}
