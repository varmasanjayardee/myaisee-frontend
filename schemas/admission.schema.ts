import { z } from "zod";

// Counsellor desk responses (keyed-backend admission/views.py, staff/ endpoints)

const outcome = z.enum(["pending", "waitlisted", "offered", "rejected", "not_offered", "declined", "withdrawn"]);

export const queueItemSchema = z.object({
  child_id: z.number(),
  child: z.string(),
  reference: z.string(),
  grade: z.string(),
  parent: z.string(),
  phone: z.string(),
  detail: z.string(),
  since: z.number().nullable(),
  urgent: z.boolean(),
});

export const dashboardSchema = z.object({
  today: z.string(),
  pipeline: z.array(z.object({ step: z.number(), label: z.string(), count: z.number() })),
  enrolled: z.number(),
  closed: z.number(),
  new_enquiries_7d: z.number(),
  actions: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      hint: z.string(),
      owner: z.enum(["you", "family"]),
      count: z.number(),
      urgent: z.number(),
      step: z.number().nullable(),
      link: z.string().nullable(),
      items: z.array(queueItemSchema),
    })
  ),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type QueueAction = Dashboard["actions"][number];

export const page = <T extends z.ZodType>(item: T) =>
  z.object({ count: z.number(), next: z.string().nullable(), previous: z.string().nullable(), results: z.array(item) });

export const applicationRowSchema = z.object({
  id: z.number(),
  reference: z.string(),
  child: z.string(),
  grade: z.string(),
  academic_year: z.string(),
  campus: z.string(),
  parent: z.string(),
  phone: z.string(),
  email: z.string(),
  current_step: z.number(),
  outcome,
  created_at: z.string(),
  last_activity: z.string(),
  flags: z.object({
    reupload_pending: z.boolean(),
    payment_failed: z.boolean(),
    visit_date: z.string().nullable(),
    offer_expires_at: z.string().nullable(),
  }),
});

export const applicationPageSchema = page(applicationRowSchema);
export type ApplicationRow = z.infer<typeof applicationRowSchema>;

export const leadRowSchema = z.object({
  id: z.number(),
  parent: z.string(),
  email: z.string(),
  phone: z.string(),
  campus: z.string(),
  grade: z.string(),
  academic_year: z.string(),
  channel: z.string(),
  channel_label: z.string(),
  enquiry_type: z.string(),
  message: z.string(),
  created_by: z.string().nullable(),
  children_count: z.number(),
  furthest_step: z.number().nullable(),
  email_status: z.string(),
  source: z.string(),
  created_at: z.string(),
});

export const leadPageSchema = page(leadRowSchema);
export type LeadRow = z.infer<typeof leadRowSchema>;

const documentSchema = z.object({
  kind: z.string(),
  original_name: z.string(),
  url: z.string().nullable(),
  status: z.enum(["submitted", "reupload_requested"]),
  reupload_note: z.string(),
  reupload_requested_at: z.string().nullable(),
  updated_at: z.string(),
});

const paymentSchema = z.object({
  id: z.number(),
  kind: z.enum(["registration", "admission"]),
  amount: z.string(),
  status: z.string(),
  /** ICICI for online, "offline" at the desk, "receipt" when the family uploaded a UPI or bank receipt */
  gateway: z.string(),
  gateway_transaction_id: z.string(),
  gateway_payment_mode: z.string(),
  receipt_url: z.string().nullable(),
  failure_reason: z.string(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
});

const requirementSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string(),
  category: z.string(),
  owner: z.enum(["parent", "school", "operations"]),
  action: z.string(),
  document_kind: z.string(),
  status: z.enum(["not_started", "in_progress", "scheduled", "done"]),
  due_date: z.string().nullable(),
  done_at: z.string().nullable(),
});

export type Requirement = z.infer<typeof requirementSchema>;

const visitSchema = z.object({
  id: z.number(),
  status: z.string(),
  slot: z.object({ date: z.string(), start_time: z.string(), visit_type_label: z.string(), gate: z.string(), staff_names: z.array(z.string()) }),
  gate_pass_code: z.string(),
  rescheduled_count: z.number(),
  attended_at: z.string().nullable(),
});

// The family's answers are read field by field from these records
const answers = z.record(z.string(), z.unknown());

export const applicationDetailSchema = z.object({
  application: answers.and(
    z.object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string(),
      grade: z.string(),
      academic_year: z.number().nullable(),
      academic_year_name: z.string().nullable(),
      reference: z.string(),
      current_step: z.number(),
      outcome,
      review_note: z.string(),
      reviewed_at: z.string().nullable(),
      offer_sent_at: z.string().nullable(),
      offer_expires_at: z.string().nullable(),
      offer_extended_at: z.string().nullable(),
      offer_accepted_at: z.string().nullable(),
      offer_declined_at: z.string().nullable(),
      offer_decline_reason: z.string(),
      joining_date: z.string().nullable(),
      aptitude_test_at: z.string().nullable(),
      aptitude_test_mode: z.enum(["campus", "online", ""]),
      aptitude_test_link: z.string(),
      campus: z.number().nullable(),
      documents: z.array(documentSchema),
      payments: z.array(paymentSchema),
      visit: visitSchema.nullable(),
      requirements: z.array(requirementSchema),
      atlas_accounts: z
        .object({
          created_at: z.string().nullable(),
          student: z.object({ name: z.string(), email: z.string() }),
          guardians: z.array(z.object({ name: z.string(), email: z.string(), relationship: z.string() })),
        })
        .nullable(),
    })
  ),
  family: answers.and(
    z.object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      phone_number: z.string(),
      guardians: z.array(answers),
      emergency_contacts: z.array(answers),
    })
  ),
  campus: z.string(),
  siblings: z.array(z.object({ id: z.number(), name: z.string(), current_step: z.number(), outcome })),
  step_history: z.array(z.object({ step: z.number(), label: z.string(), completed_at: z.string(), by: z.string().nullable() })),
  reviewed_by: z.string().nullable(),
});

export type ApplicationDetail = z.infer<typeof applicationDetailSchema>;

export const visitRowSchema = z.object({
  id: z.number(),
  status: z.enum(["booked", "attended"]),
  child_id: z.number(),
  child: z.string(),
  grade: z.string(),
  reference: z.string(),
  parent: z.string(),
  phone: z.string(),
  date: z.string(),
  start_time: z.string(),
  visit_type: z.string(),
  gate: z.string(),
  campus: z.string(),
  staff: z.array(z.string()),
  gate_pass_code: z.string(),
  attended_at: z.string().nullable(),
});

export const visitPageSchema = page(visitRowSchema).extend({
  counts: z.object({ upcoming: z.number(), today: z.number(), past: z.number(), all: z.number() }),
});
export type VisitRow = z.infer<typeof visitRowSchema>;

const choice = z.object({ value: z.string(), label: z.string() });

/** A campus with its academic years still open for admission (keyed-backend schools.AcademicYear) and its grades */
export const campusSchema = z.object({
  id: z.number(),
  name: z.string(),
  academic_years: z.array(z.object({ id: z.number(), name: z.string() })),
  /** The grades it admits, in order */
  grades: z.array(z.object({ value: z.string(), label: z.string(), stage: z.string() })),
});
export type CampusOption = z.infer<typeof campusSchema>;

export const optionsSchema = z.object({
  campuses: z.array(campusSchema),
  grades: z.array(z.object({ value: z.string(), label: z.string(), stage: z.string() })),
  stages: z.array(choice),
  steps: z.array(z.object({ value: z.number(), label: z.string() })),
  /** only_in: the one kind of fee plan the type belongs to; null fits either */
  fee_types: z.array(choice.extend({ only_in: z.enum(["registration", "admission"]).nullable() })),
  fee_plan_kinds: z.array(z.object({ value: z.enum(["registration", "admission"]), label: z.string() })),
  frequencies: z.array(choice),
  document_kinds: z.array(choice),
  channels: z.array(choice),
  classes: z.array(z.object({ id: z.number(), label: z.string(), campus: z.number() })),
  staff: z.array(z.object({ id: z.number(), name: z.string(), role: z.string() })),
});

export type Options = z.infer<typeof optionsSchema>;

export const feeItemSchema = z.object({
  id: z.number().optional(),
  fee_type: z.string(),
  label: z.string(),
  amount: z.string(),
  frequency: z.string(),
  payable_at: z.string().optional(),
  annual_amount: z.string().optional(),
  is_refundable: z.boolean(),
  is_optional: z.boolean(),
  sequence: z.number(),
});

export const feePlanSchema = z.object({
  id: z.number(),
  /** Paid at step 2 (registration) or step 8 (admission) */
  kind: z.enum(["registration", "admission"]),
  /** Set on a custom plan: that child's own fee, over the default */
  child: z.number().nullable(),
  campus: z.number(),
  campus_name: z.string(),
  academic_year: z.number().nullable(),
  academic_year_name: z.string().nullable(),
  grade: z.string(),
  stage: z.string().nullable(),
  terms_per_year: z.number(),
  notes: z.string(),
  items: z.array(feeItemSchema),
  updated_at: z.string(),
});

export type FeePlan = z.infer<typeof feePlanSchema>;
export type FeeItem = z.infer<typeof feeItemSchema>;

export const slotSchema = z.object({
  id: z.number(),
  campus: z.number(),
  campus_name: z.string(),
  date: z.string(),
  start_time: z.string(),
  duration_minutes: z.number(),
  visit_type: z.enum(["counsellor", "museum"]),
  visit_type_label: z.string(),
  stage: z.string(),
  gate: z.string(),
  staff: z.array(z.number()),
  staff_names: z.array(z.string()),
  capacity: z.number(),
  families_booked: z.number(),
  places_left: z.number(),
});

export type Slot = z.infer<typeof slotSchema>;

export const accountsCreatedSchema = z.object({
  student: z.object({ student_id: z.number(), name: z.string(), email: z.string(), temporary_password: z.string() }),
  guardians: z.array(
    z.object({ guardian_id: z.number(), name: z.string(), email: z.string(), temporary_password: z.string().nullable(), existing_account: z.boolean() })
  ),
  enrollment_id: z.number(),
  class: z.string(),
  current_step: z.number(),
});

export type AccountsCreated = z.infer<typeof accountsCreatedSchema>;

export const staffProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.string(),
  designation: z.string().nullable(),
  campus: z.string().nullable(),
  employee_id: z.string().nullable(),
  photo: z.string().nullable(),
  work: z.object({
    active_families: z.number(),
    active_applications: z.number(),
    closed: z.number(),
    enrolled: z.number(),
    enquiries_added: z.number(),
    decisions: z.number(),
    visits_upcoming: z.number(),
    visits_hosted: z.number(),
    payments_received: z.number(),
    payments_total: z.string(),
    notes: z.number(),
  }),
  recent: z.array(z.object({ child_id: z.number(), child: z.string(), step: z.number(), label: z.string(), at: z.string() })),
});
export type StaffProfile = z.infer<typeof staffProfileSchema>;
