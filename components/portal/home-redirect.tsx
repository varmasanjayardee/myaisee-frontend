"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { dashboardHref, resolveDashboard } from "@/lib/roles";
import { useMe } from "@/services/auth.service";

/** "/" sends signed-in users to their dashboard, everyone else to /login */
export function HomeRedirect() {
  const router = useRouter();
  const me = useMe();
  const dashboard = me.data ? resolveDashboard(me.data) : null;
  const target = me.isPending ? null : dashboard ? dashboardHref(dashboard) : "/login";

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return <Loader2Icon className="m-auto size-6 animate-spin text-muted-foreground" aria-label="Loading" />;
}
