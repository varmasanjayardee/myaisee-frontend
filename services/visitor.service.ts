import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  gateDashboardSchema,
  visitorOptionsSchema,
  visitorPageSchema,
  visitorSchema,
  type Visitor,
  type VisitorInput,
} from "@/schemas/visitor.schema";

// keyed-backend admission/ staff/visitors/* (visitor manager or admin).
// Errors arrive as Error(message) from lib/api.ts.

const base = "/admission/staff/visitors";

export const visitorKeys = {
  all: ["visitor"] as const,
  dashboard: ["visitor", "dashboard"] as const,
  list: (filters: object) => ["visitor", "list", filters] as const,
  options: ["visitor", "options"] as const,
};

export interface VisitorFilters {
  when?: "today" | "upcoming" | "past" | "all";
  status?: string;
  purpose?: string;
  date?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

const clean = (filters: object) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""));

export function useGateDashboard() {
  return useQuery({
    queryKey: visitorKeys.dashboard,
    queryFn: () => api.get(`${base}/dashboard/`).then((r) => gateDashboardSchema.parse(r.data)),
    refetchInterval: 60_000,
  });
}

export function useVisitorLog(filters: VisitorFilters) {
  return useQuery({
    queryKey: visitorKeys.list(filters),
    queryFn: () => api.get(`${base}/`, { params: clean(filters) }).then((r) => visitorPageSchema.parse(r.data)),
    // The old page stays up while the next loads, so the table doesn't flash empty
    placeholderData: keepPreviousData,
    refetchInterval: filters.when === "today" ? 60_000 : false,
  });
}

export function useVisitorOptions() {
  return useQuery({
    queryKey: visitorKeys.options,
    queryFn: () => api.get(`${base}/options/`).then((r) => visitorOptionsSchema.parse(r.data)),
    staleTime: 10 * 60_000,
  });
}

/** Anything the desk changes moves numbers on the gate dashboard and the log */
function useRefreshGate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: visitorKeys.all });
}

/** One mutation for register and edit: no id posts, an id patches */
export function useSaveVisitor() {
  const refresh = useRefreshGate();
  return useMutation<Visitor, Error, { id?: number; values: Partial<VisitorInput> & { check_in?: boolean } }>({
    mutationFn: ({ id, values }) =>
      (id ? api.patch(`${base}/${id}/`, values) : api.post(`${base}/`, values)).then((r) => visitorSchema.parse(r.data)),
    onSuccess: refresh,
  });
}

export type VisitorAction = "approve" | "reject" | "check-in" | "check-out" | "cancel";

const DONE: Record<VisitorAction, (v: Visitor) => string> = {
  approve: (v) => `${v.name} approved. Pass ${v.pass_code}.`,
  reject: (v) => `${v.name} turned away`,
  "check-in": (v) => `${v.name} checked in${v.badge_number ? ` with badge ${v.badge_number}` : ""}`,
  "check-out": (v) => `${v.name} checked out`,
  cancel: (v) => `${v.name}'s visit cancelled`,
};

export function useVisitorAction() {
  const refresh = useRefreshGate();
  return useMutation<Visitor, Error, { id: number; action: VisitorAction; note?: string; badge_number?: string }>({
    mutationFn: ({ id, action, ...body }) => api.post(`${base}/${id}/${action}/`, body).then((r) => visitorSchema.parse(r.data)),
    onSuccess: (visitor, { action }) => {
      toast.success(DONE[action](visitor));
      return refresh();
    },
    onError: (error) => toast.error(error.message),
  });
}
