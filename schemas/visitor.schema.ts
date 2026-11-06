import { z } from "zod";
import { page } from "./admission.schema";

// keyed-backend admission/ staff/visitors/* (visitor manager or admin)

export const VISITOR_STATUSES = ["pending", "approved", "checked_in", "checked_out", "rejected", "cancelled"] as const;
export type VisitorStatus = (typeof VISITOR_STATUSES)[number];

export const visitorSchema = z.object({
  id: z.number(),
  status: z.enum(VISITOR_STATUSES),
  status_label: z.string(),
  name: z.string(),
  phone_number: z.string(),
  email: z.string(),
  company: z.string(),
  purpose: z.string(),
  purpose_label: z.string(),
  host: z.number().nullable(),
  host_name: z.string(),
  campus: z.number(),
  campus_name: z.string(),
  party_size: z.number(),
  id_type: z.string(),
  id_last4: z.string(),
  id_document_name: z.string(),
  id_document_url: z.string().nullable(),
  address: z.string(),
  photo_url: z.string().nullable(),
  visitor_type: z.enum(["parent", "other"]),
  student_name: z.string(),
  guardian_relationship: z.string(),
  gate: z.string(),
  vehicle_number: z.string(),
  expected_at: z.string(),
  pass_code: z.string(),
  badge_number: z.string(),
  notes: z.string(),
  decision_note: z.string(),
  approved_at: z.string().nullable(),
  approved_by: z.string().nullable(),
  checked_in_at: z.string().nullable(),
  checked_in_by: z.string().nullable(),
  checked_out_at: z.string().nullable(),
  checked_out_by: z.string().nullable(),
  minutes_on_site: z.number().nullable(),
  overstay: z.boolean(),
  created_by: z.string().nullable(),
  created_at: z.string().nullable(),
});
export type Visitor = z.infer<typeof visitorSchema>;

export const visitorPassSchema = visitorSchema.extend({ qr: z.string() });

export const parentLookupSchema = z.object({
  students: z.array(z.object({ id: z.number(), name: z.string(), admission_number: z.string().nullable(), class: z.string() })),
  guardians: z.array(z.object({ id: z.number(), name: z.string(), relationship: z.string(), photo_url: z.string().nullable() })),
});
export type ParentLookup = z.infer<typeof parentLookupSchema>;

export const keeperSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.string().optional(),
  school: z.string().nullable().optional(),
  campus: z.string().nullable().optional(),
  work: z.object({ employee_id: z.string().nullable(), designation: z.string().nullable() }).partial().optional(),
  gate: z.number().nullable(),
  gate_name: z.string(),
  gates: z.array(z.object({ id: z.number(), name: z.string() })),
});

export const visitorPageSchema = page(visitorSchema).extend({
  counts: z.record(z.enum([...VISITOR_STATUSES, "all"]), z.number()),
});

const choice = z.object({ value: z.string(), label: z.string() });

export const visitorOptionsSchema = z.object({
  campuses: z.array(z.object({ id: z.number(), name: z.string() })),
  purposes: z.array(choice),
  id_types: z.array(choice),
  statuses: z.array(choice),
  hosts: z.array(z.object({ id: z.number(), name: z.string(), role: z.string(), campus: z.number().nullable() })),
});
export type VisitorOptions = z.infer<typeof visitorOptionsSchema>;

export const gateTodaySchema = z.object({
  appointment_count: z.number(),
  visitor_list_count: z.number(),
});

export const gateDashboardSchema = z.object({
  today: z.object({
    expected: z.number(),
    pending: z.number(),
    on_site: z.number(),
    people_on_site: z.number(),
    checked_out: z.number(),
    turned_away: z.number(),
    overstay: z.number(),
    admissions_expected: z.number(),
    admissions_arrived: z.number(),
  }),
  average_minutes: z.number().nullable(),
  overstay_hours: z.number(),
  trend: z.array(z.object({ date: z.string(), visitors: z.number(), admissions: z.number() })),
  purposes: z.array(z.object({ value: z.string(), label: z.string(), count: z.number() })),
  hours: z.array(z.object({ hour: z.number(), count: z.number() })),
  on_site: z.array(visitorSchema),
  pending: z.array(visitorSchema),
  arriving: z.array(visitorSchema),
});
export type GateDashboard = z.infer<typeof gateDashboardSchema>;

/** What the desk form sends; status changes go through the actions */
export const visitorInputSchema = z.object({
  name: z.string().trim().min(1, "Enter the visitor's name"),
  phone_number: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  company: z.string(),
  purpose: z.string().min(1),
  host: z.number().nullable(),
  campus: z.number().optional(),
  party_size: z.number().int().min(1, "At least 1").max(50, "At most 50"),
  id_type: z.string(),
  id_last4: z.union([z.literal(""), z.string().regex(/^[A-Za-z0-9]{4}$/, "Last 4 characters only")]),
  vehicle_number: z.string(),
  expected_at: z.string().min(1, "Choose when they're coming"),
  badge_number: z.string(),
  notes: z.string(),
});
export type VisitorInput = z.infer<typeof visitorInputSchema>;
