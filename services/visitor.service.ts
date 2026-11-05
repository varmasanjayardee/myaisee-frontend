import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  gateDashboardSchema,
  gateTodaySchema,
  keeperSchema,
  parentLookupSchema,
  visitorPassSchema,
  type ParentLookup,
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

/** Just today's counts, for the gate home */
export function useGateToday() {
  return useQuery({
    queryKey: ["visitor", "today"],
    queryFn: () => api.get(`${base}/today/`).then((r) => gateTodaySchema.parse(r.data)),
    refetchInterval: 60_000,
  });
}

export function useVisitorLog(filters: VisitorFilters, enabled = true) {
  return useQuery({
    enabled,
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
export function useRefreshGate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: visitorKeys.all });
}

/** One mutation for register and edit: no id posts, an id patches */
export function useSaveVisitor() {
  const refresh = useRefreshGate();
  return useMutation<Visitor, Error, { id?: number; values: Partial<VisitorInput> & { check_in?: boolean; student?: number; guardian?: number; address?: string; photo_key?: string; id_document_key?: string; id_document_name?: string } }>({
    mutationFn: ({ id, values }) =>
      (id ? api.patch(`${base}/${id}/`, values) : api.post(`${base}/`, values)).then((r) => visitorSchema.parse(r.data)),
    onSuccess: refresh,
  });
}

/** An ID copy or photo goes straight to storage; its key is saved with the visitor */
export function useUploadVisitorFile() {
  return useMutation<string, Error, { kind: "id_proof" | "photo"; file: File }>({
    mutationFn: async ({ kind, file }) => {
      const signed = await api
        .post(`${base}/upload/sign/`, { kind, filename: file.name, content_type: file.type, size: file.size })
        .then((r) => r.data as { key: string; upload_url: string; content_type: string });
      const put = await fetch(signed.upload_url, { method: "PUT", headers: { "Content-Type": signed.content_type }, body: file }).catch(() => null);
      if (!put?.ok) throw new Error("The file didn't reach storage. Check the connection and try again.");
      return signed.key;
    },
  });
}

export function useVisitor(id: number) {
  return useQuery({ queryKey: ["visitor", "one", id], queryFn: () => api.get(`${base}/${id}/`).then((r) => visitorSchema.parse(r.data)) });
}

export function useVisitorPass(id: number) {
  return useQuery({ queryKey: ["visitor", "pass", id], queryFn: () => api.get(`${base}/${id}/pass/`).then((r) => visitorPassSchema.parse(r.data)) });
}

/** The pass as a PDF, saved through a temporary link (the request needs the login cookie) */
export async function downloadVisitorPass(id: number, code: string) {
  const blob = await api.get(`${base}/${id}/pass/`, { params: { output: "pdf" }, responseType: "blob" }).then((r) => r.data as Blob);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `visit-pass-${code}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/** The family on the school's records with this mobile number */
export function useParentLookup() {
  return useMutation<ParentLookup, Error, string>({
    mutationFn: (phone) => api.get(`${base}/parents/`, { params: { phone } }).then((r) => parentLookupSchema.parse(r.data)),
  });
}

export function useKeeper() {
  return useQuery({ queryKey: ["visitor", "keeper"], queryFn: () => api.get(`${base}/gates/`).then((r) => keeperSchema.parse(r.data)), staleTime: 5 * 60_000 });
}

export function useSetGate() {
  const refresh = useRefreshGate();
  return useMutation<unknown, Error, { gate?: number | null; name?: string }>({
    mutationFn: (body) => api.post(`${base}/gates/`, body),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
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
