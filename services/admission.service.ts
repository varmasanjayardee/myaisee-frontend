import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/lib/api";
import type { Outcome } from "@/lib/admission";
import {
  accountsCreatedSchema,
  applicationDetailSchema,
  applicationPageSchema,
  dashboardSchema,
  feePlanSchema,
  leadPageSchema,
  leadRowSchema,
  optionsSchema,
  slotSchema,
  staffProfileSchema,
  visitPageSchema,
  type AccountsCreated,
  type FeeItem,
} from "@/schemas/admission.schema";

// keyed-backend admission/ staff endpoints (counsellor or admin login).
// Errors arrive as Error(message) from lib/api.ts.

const base = "/admission/staff";

export const admissionKeys = {
  all: ["admission"] as const,
  dashboard: ["admission", "dashboard"] as const,
  applications: (filters: object) => ["admission", "applications", filters] as const,
  application: (id: number) => ["admission", "application", id] as const,
  leads: (filters: object) => ["admission", "leads", filters] as const,
  visits: (filters: object) => ["admission", "visits", filters] as const,
  options: (campus?: number | null) => ["admission", "options", campus ?? "all"] as const,
  feePlans: ["admission", "fee-plans"] as const,
  slots: (filters: object) => ["admission", "slots", filters] as const,
};

/** Anything a counsellor changes can move families between queue items and steps */
function useRefreshDesk() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: admissionKeys.all });
}

export function useDesk() {
  return useQuery({
    queryKey: admissionKeys.dashboard,
    queryFn: () => api.get(`${base}/dashboard/`).then((r) => dashboardSchema.parse(r.data)),
    refetchInterval: 60_000,
  });
}

export interface ApplicationFilters {
  q?: string;
  step?: string;
  outcome?: string;
  campus?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

const clean = (filters: object) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""));

export function useApplications(filters: ApplicationFilters) {
  return useQuery({
    queryKey: admissionKeys.applications(filters),
    queryFn: () =>
      api.get(`${base}/applications/`, { params: clean(filters) }).then((r) => applicationPageSchema.parse(r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: admissionKeys.application(id),
    queryFn: () => api.get(`${base}/applications/${id}/`).then((r) => applicationDetailSchema.parse(r.data)),
  });
}

export function useLeads(filters: { q?: string; status?: string; channel?: string; page?: number; page_size?: number }) {
  return useQuery({
    queryKey: admissionKeys.leads(filters),
    queryFn: () => api.get(`${base}/leads/`, { params: clean(filters) }).then((r) => leadPageSchema.parse(r.data)),
    placeholderData: keepPreviousData,
  });
}

export interface VisitFilters {
  when?: "upcoming" | "today" | "past" | "all";
  status?: string;
  date?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

/** Visits, paginated; `counts` feed the Upcoming / Today / Past / All tabs */
export function useVisits(filters: VisitFilters) {
  return useQuery({
    queryKey: admissionKeys.visits(filters),
    queryFn: () => api.get(`${base}/visits/`, { params: clean(filters) }).then((r) => visitPageSchema.parse(r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useOptions(campus?: number | null) {
  return useQuery({
    queryKey: admissionKeys.options(campus),
    queryFn: () => api.get(`${base}/options/`, { params: campus ? { campus } : {} }).then((r) => optionsSchema.parse(r.data)),
    staleTime: 10 * 60_000,
  });
}

/** Shared shape for counsellor actions: toast on success, refresh the desk */
function useDeskAction<TVars, TResult = unknown>(fn: (vars: TVars) => Promise<TResult>, success: string | ((r: TResult) => string)) {
  const refresh = useRefreshDesk();
  return useMutation<TResult, Error, TVars>({
    mutationFn: fn,
    onSuccess: (result) => {
      toast.success(typeof success === "function" ? success(result) : success);
      return refresh();
    },
    onError: (error) => toast.error(error.message),
  });
}

export type Decision = "accepted" | "waiting_list" | "rejected" | "not_offered";

export const useDecide = (id: number) =>
  useDeskAction(
    (vars: { status: Decision; note: string }) => api.post(`${base}/applications/${id}/review/`, vars),
    "Decision saved. The family sees it now."
  );

export const useCheckIn = () =>
  useDeskAction((bookingId: number) => api.post(`${base}/visits/${bookingId}/check-in/`), "Checked in. Moved to review.");

export const useSetJoiningDate = (id: number) =>
  useDeskAction(
    (joining_date: string) => api.patch(`${base}/applications/${id}/joining/`, { joining_date }).then((r) => r.data as { current_step: number }),
    (r) => (r.current_step === 9 ? "Joining date set. Ready for accounts." : "Joining date set")
  );

export const useUpdateRequirement = () =>
  useDeskAction(
    (vars: { id: number; status: string }) => api.patch(`${base}/requirements/${vars.id}/`, { status: vars.status }),
    "Checklist updated"
  );

export const useRequestReupload = (id: number) =>
  useDeskAction(
    (vars: { kind: string; note: string }) => api.post(`${base}/applications/${id}/documents/${vars.kind}/reupload/`, { note: vars.note }),
    "Asked the family for a new copy"
  );

export function useCreateAccounts(id: number) {
  const refresh = useRefreshDesk();
  return useMutation<AccountsCreated, Error, { student_email: string; academic_class_id: number; admission_number: string }>({
    mutationFn: (vars) => api.post(`${base}/applications/${id}/accounts/`, vars).then((r) => accountsCreatedSchema.parse(r.data)),
    onSuccess: () => refresh(),
  });
}

export function useFeePlans() {
  return useQuery({
    queryKey: admissionKeys.feePlans,
    queryFn: () => api.get(`${base}/fee-plans/`).then((r) => z.array(feePlanSchema).parse(r.data)),
  });
}

export type FeeKind = "registration" | "admission";

/** A child's custom fee plans (at most one per kind) */
export function useChildFeePlans(childId: number) {
  return useQuery({
    queryKey: [...admissionKeys.feePlans, "child", childId],
    queryFn: () => api.get(`${base}/fee-plans/`, { params: { child: childId } }).then((r) => z.array(feePlanSchema).parse(r.data)),
  });
}

export interface FeePlanInput {
  kind: FeeKind;
  /** A custom plan for this child; campus, year and grade then come from the child */
  child: number | null;
  // Default plans only: a custom plan takes all three from the child
  campus?: number;
  academic_year?: number;
  grade?: string;
  terms_per_year: number;
  notes: string;
  items: Omit<FeeItem, "id" | "payable_at" | "annual_amount">[];
}

export const useSaveFeePlan = () =>
  useDeskAction(
    ({ id, ...plan }: FeePlanInput & { id?: number }) =>
      id ? api.put(`${base}/fee-plans/${id}/`, plan) : api.post(`${base}/fee-plans/`, plan),
    "Fee plan saved"
  );

export const useDeleteFeePlan = () => useDeskAction((id: number) => api.delete(`${base}/fee-plans/${id}/`), "Fee plan deleted");

export function useSlots(filters: { campus?: string; date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: admissionKeys.slots(filters),
    queryFn: () => api.get(`${base}/slots/`, { params: clean(filters) }).then((r) => z.array(slotSchema).parse(r.data)),
  });
}

export interface SlotInput {
  campus: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  visit_type: "counsellor" | "museum";
  capacity: number;
  stage: string;
  gate: string;
  staff: number[];
}

export const useSaveSlot = () =>
  useDeskAction(
    ({ id, ...slot }: SlotInput & { id?: number }) => (id ? api.patch(`${base}/slots/${id}/`, slot) : api.post(`${base}/slots/`, slot)),
    "Slot saved"
  );

export const useDeleteSlot = () => useDeskAction((id: number) => api.delete(`${base}/slots/${id}/`), "Slot removed");

export interface EnquiryInput {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  campus: number;
  grade: string;
  academic_year: number;
  channel: string;
  message: string;
  send_link: boolean;
}

/** A counsellor captures an enquiry; the form shows field errors itself */
export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EnquiryInput) => api.post(`${base}/leads/`, input).then((r) => leadRowSchema.parse(r.data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: admissionKeys.all }),
  });
}

// ---- Assisted admission: staff act for the family (staff/leads/<lead>/…) ----

const family = (leadId: number) => `${base}/leads/${leadId}`;

export const familyKey = (leadId: number) => ["admission", "family", leadId] as const;

/** The family with every child's journey (same shape as the family's own me/) */
export function useFamily(leadId: number) {
  return useQuery({
    queryKey: familyKey(leadId),
    queryFn: () => api.get(`${family(leadId)}/`).then((r) => r.data as FamilyRecord),
  });
}

export type FamilyRecord = Record<string, unknown> & {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  children: FamilyChild[];
  guardians: Record<string, unknown>[];
  emergency_contacts: Record<string, unknown>[];
  created_at: string;
  /** What only staff see */
  desk: { reference: string; channel: string; created_by: string | null; notes: LeadNote[] };
};

export interface LeadNote {
  id: number;
  body: string;
  by: string | null;
  created_at: string;
}

export type FamilyChild = Record<string, unknown> & {
  id: number;
  first_name: string;
  last_name: string;
  current_step: number;
  outcome: Outcome;
  grade: string;
  academic_year: number | null;
  academic_year_name: string | null;
  documents: { kind: string; original_name: string; url: string | null; status: string; reupload_note: string }[];
  reference: string;
  date_of_birth: string | null;
  visit: { status: string; slot: { date: string; start_time: string } } | null;
};

export const useAddChild = (leadId: number) =>
  useDeskAction(
    (vars: { first_name: string; last_name: string }) => api.post(`${family(leadId)}/children/`, vars).then((r) => r.data as { id: number }),
    "Child added"
  );

/** Saves one section of the application: child answers, or the family's shared sections */
export function useSaveSection(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { childId?: number; scope: "child" | "family"; values: Record<string, unknown> }>({
    mutationFn: ({ childId, scope, values }) =>
      scope === "family" ? api.patch(`${family(leadId)}/`, values) : api.patch(`${family(leadId)}/children/${childId}/`, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: admissionKeys.all }),
  });
}

/**
 * Documents go straight to storage: sign (keyed-backend checks kind, type, size and
 * the step), PUT the file to the presigned URL, then attach the key to the child.
 */
async function uploadDocument(documentsUrl: string, kind: string, file: File) {
  const contentType = file.type || ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" } as Record<string, string>)[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
  const signed = await api
    .post(`${documentsUrl}sign/`, { kind, filename: file.name, content_type: contentType, size: file.size })
    .then((r) => r.data as { key: string; upload_url: string; content_type: string });
  const put = await fetch(signed.upload_url, { method: "PUT", headers: { "Content-Type": signed.content_type }, body: file }).catch(() => null);
  if (!put?.ok) throw new Error("The file didn't reach storage. Check the connection and try again.");
  return api.post(documentsUrl, { kind, file_key: signed.key, original_name: file.name });
}

export function useUploadForFamily(leadId: number, childId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { kind: string; file: File }>({
    mutationFn: ({ kind, file }) => uploadDocument(`${family(leadId)}/children/${childId}/documents/`, kind, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: admissionKeys.all }),
    onError: (error) => toast.error(error.message),
  });
}

export const useSubmitForFamily = (leadId: number, childId: number) =>
  useDeskAction(() => api.post(`${family(leadId)}/children/${childId}/submit/`), "Application submitted for the family");

export function useFamilyFees(leadId: number, childId: number) {
  return useQuery({
    queryKey: ["admission", "fees", childId],
    queryFn: () =>
      api.get(`${family(leadId)}/children/${childId}/fees/`).then(
        (r) =>
          r.data as Record<FeeKind, { plan_id: number | null; custom: boolean; total: string; items: FeeItem[] }> & {
            plan: { campus: string; grade: string; academic_year: string; terms_per_year: number };
          }
      ),
    retry: false,
  });
}

/** Starts an online payment; the returned link goes to the family */
export function usePaymentLink(leadId: number, childId: number) {
  return useMutation<{ redirect_url: string }, Error, "registration" | "admission">({
    mutationFn: (kind) => api.post(`${family(leadId)}/children/${childId}/payments/${kind}/link/`).then((r) => r.data as { redirect_url: string }),
    onError: (error) => toast.error(error.message),
  });
}

/** A family's uploaded UPI or bank receipt: approving completes the fee step, rejecting sends the note back */
export const useReviewReceipt = () =>
  useDeskAction(
    (vars: { id: number; action: "approve" | "reject"; note?: string }) => api.post(`${base}/payments/${vars.id}/${vars.action}/`, { note: vars.note ?? "" }),
    (r: unknown) => ((r as { data: { status: string } }).data.status === "success" ? "Receipt approved. The fee is paid." : "Receipt rejected. The family sees your note.")
  );

export const useOfflinePayment = (leadId: number, childId: number) =>
  useDeskAction(
    (vars: { kind: "registration" | "admission"; method: string; reference: string }) =>
      api.post(`${family(leadId)}/children/${childId}/payments/${vars.kind}/offline/`, { method: vars.method, reference: vars.reference }),
    "Payment recorded"
  );

export function useFamilySlots(leadId: number, childId: number) {
  return useQuery({
    queryKey: ["admission", "child-slots", childId],
    queryFn: () => api.get(`${family(leadId)}/children/${childId}/slots/`).then((r) => r.data as FamilySlot[]),
  });
}

export interface FamilySlot {
  id: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  visit_type: "counsellor" | "museum";
  visit_type_label: string;
  gate: string;
  staff_names: string[];
  capacity: number;
  places_left: number;
}

export const useVisitForFamily = (leadId: number, childId: number) =>
  useDeskAction(
    (vars: { action: "book" | "reschedule" | "cancel"; slot?: number; hearing_aid?: boolean }) => {
      const url = `${family(leadId)}/children/${childId}/visit/`;
      return vars.action === "cancel"
        ? api.delete(url)
        : vars.action === "book"
          ? api.post(url, { slot: vars.slot, hearing_aid: vars.hearing_aid })
          : api.patch(url, { slot: vars.slot, hearing_aid: vars.hearing_aid });
    },
    "Visit updated"
  );

export const useOfferForFamily = (leadId: number, childId: number) =>
  useDeskAction(
    (vars: { action: "accept" | "extend" | "decline"; agreed?: boolean; reason?: string }) =>
      api.post(`${family(leadId)}/children/${childId}/offer/`, vars),
    "Offer updated"
  );

export const useConfirmForFamily = (leadId: number, childId: number) =>
  useDeskAction((requirementId: number) => api.post(`${family(leadId)}/children/${childId}/joining/${requirementId}/confirm/`), "Confirmed for the family");

export const useLogNote = (leadId: number) =>
  useDeskAction((body: string) => api.post(`${family(leadId)}/notes/`, { body }), "Note saved");

/** Atlas drafts a message to the family; the counsellor edits and sends it themselves */
export function useDraftMessage(leadId: number) {
  return useMutation<string, Error, { child?: number; channel: "whatsapp" | "email"; about?: string }>({
    mutationFn: (vars) => api.post(`${family(leadId)}/draft/`, vars).then((r) => (r.data as { draft: string }).draft),
    onError: (error) => toast.error(error.message),
  });
}

/** The signed-in counsellor and the admissions work they've done */
export function useStaffProfile() {
  return useQuery({
    queryKey: ["admission", "profile"],
    queryFn: () => api.get(`${base}/profile/`).then((r) => staffProfileSchema.parse(r.data)),
  });
}
