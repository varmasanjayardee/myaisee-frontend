"use client";

import { DASHBOARDS, STAFF_ROLE_LABEL, USER_TYPE_LABEL, type Dashboard } from "@/lib/roles";
import { useMe } from "@/services/auth.service";

/** Sample home: shows what /me/ says about the signed-in user */
export function DashboardHome({ dashboard }: { dashboard: Dashboard }) {
  const { data: me } = useMe();
  if (!me) return null;

  const rows = [
    ["User type", `${USER_TYPE_LABEL[me.role ?? 0] ?? "Unknown"} (role ${me.role})`],
    me.staff_role && ["Staff role", `${STAFF_ROLE_LABEL[me.staff_role] ?? "Unknown"} (staff_role ${me.staff_role})`],
    ["User ID", me.id],
    me.student_id && ["Student ID", me.student_id],
    me.staff_id && ["Staff ID", me.staff_id],
    me.guardian_id && ["Guardian ID", me.guardian_id],
    ["Campus", me.campus ?? "-"],
  ].filter((row) => !!row);

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">{DASHBOARDS[dashboard].title} dashboard</h1>
      <dl className="mt-6 divide-y rounded-xl border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
