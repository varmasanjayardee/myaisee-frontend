import type { Me } from "@/schemas/auth.schema";

// Mirrors keyed-backend: common/enums.py UserType, staff/enums.py StaffRole
export const UserType = { STUDENT: 1, STAFF: 2, GUARDIAN: 3 } as const;

export const USER_TYPE_LABEL: Record<number, string> = {
  1: "Student",
  2: "Staff",
  3: "Guardian",
};

export const STAFF_ROLE_LABEL: Record<number, string> = {
  1: "Mentor",
  2: "Finance",
  3: "Admin",
  4: "Transport",
  5: "Coordinator",
  6: "Admission Counsellor",
};

/** One per folder in app/(dashboard)/ */
export type Dashboard =
  | "student"
  | "guardian"
  | "mentor"
  | "finance"
  | "admin"
  | "transport"
  | "coordinator"
  | "admission";

const STAFF_DASHBOARD: Record<number, Dashboard> = {
  1: "mentor",
  2: "finance",
  3: "admin",
  4: "transport",
  5: "coordinator",
  6: "admission",
};

/** role picks the user type; for staff, staff_role picks the dashboard */
export function resolveDashboard(me: Me): Dashboard | null {
  if (me.role === UserType.STUDENT) return me.student_id ? "student" : null;
  if (me.role === UserType.GUARDIAN) return "guardian";
  if (me.role === UserType.STAFF && me.staff_role) return STAFF_DASHBOARD[me.staff_role] ?? null;
  return null;
}

/** "Student", "Guardian", "Staff · Finance" */
export function roleLabel(me: Me) {
  const type = USER_TYPE_LABEL[me.role ?? 0] ?? "Unknown";
  return me.role === UserType.STAFF && me.staff_role
    ? ` ${STAFF_ROLE_LABEL[me.staff_role] ?? "Unknown role"}`
    : type;
}

export const DASHBOARDS: Record<Dashboard, { title: string }> = {
  student: { title: "Student" },
  guardian: { title: "Guardian" },
  mentor: { title: "Mentor" },
  finance: { title: "Finance" },
  admin: { title: "Admin" },
  transport: { title: "Transport" },
  coordinator: { title: "Coordinator" },
  admission: { title: "Admissions" },
};

export const dashboardHref = (dashboard: Dashboard, section = "") =>
  section ? `/${dashboard}/${section}` : `/${dashboard}`;
