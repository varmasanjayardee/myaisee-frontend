import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  FileTextIcon,
  HeartPulseIcon,
  HouseIcon,
  PenLineIcon,
  PhoneIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { FamilyChild as Child, FamilyRecord as Lead } from "@/services/admission.service";

// Ported from atlas-admission lib/application-form.ts (keep the two in step). Keys are the keyed-backend field names; `required`
// mirrors APPLICATION_REQUIRED in admission/models.py, which has the final say on submit.

export type Values = Record<string, unknown>;
export type Option = string | { value: string; label: string };

export interface FormField {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "textarea" | "select" | "seg" | "chips" | "toggle" | "file";
  required?: boolean;
  /** "campuses" is filled from the API */
  options?: readonly Option[] | "campuses";
  help?: string;
  /** Shown (and required) only when this returns true */
  when?: (values: Values) => boolean;
}

export interface FormSection {
  id: string;
  title: string;
  icon: LucideIcon;
  /** child: answers per child; family: shared by all the parent's children */
  scope: "child" | "family";
  /** Repeating rows stored as a list on the lead */
  repeat?: { key: "guardians" | "emergency_contacts"; one: string; add: string; min: number };
  fields: FormField[];
}

const LANGUAGES = ["English", "Hindi", "Punjabi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Malayalam", "Kannada", "Urdu", "Other"];
export const GRADES = [
  "Pre-Nursery", "Nursery", "Reception",
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13",
];

/** Cambridge stage per grade; same as GRADE_STAGE in keyed-backend admission/models.py */
export const GRADE_STAGE_LABEL: Record<string, string> = Object.fromEntries(
  GRADES.map((g, i) => [
    g,
    i < 3 ? "Early Years" : i < 9 ? "Primary" : i < 12 ? "Lower Secondary" : i < 14 ? "Upper Secondary (IGCSE)" : "Advanced (AS & A Level)",
  ])
);

export const APPLICATION_SECTIONS: FormSection[] = [
  {
    id: "child",
    title: "Child",
    icon: UserIcon,
    scope: "child",
    fields: [
      { key: "first_name", label: "First name, as on the birth certificate", type: "text", required: true },
      { key: "last_name", label: "Last name, as on the birth certificate", type: "text" },
      { key: "preferred_name", label: "Preferred name", type: "text" },
      { key: "date_of_birth", label: "Date of birth", type: "date", required: true },
      {
        key: "gender",
        label: "Gender",
        type: "seg",
        required: true,
        options: [
          { value: "girl", label: "Girl" },
          { value: "boy", label: "Boy" },
          { value: "undisclosed", label: "Prefer not to say" },
        ],
      },
      { key: "nationality", label: "Nationality", type: "select", required: true, options: ["Indian", "Overseas Citizen of India", "Other"] },
      { key: "mother_tongue", label: "Mother tongue", type: "select", required: true, options: LANGUAGES },
      { key: "home_languages", label: "Languages spoken at home", type: "chips", options: LANGUAGES.slice(0, 8) },
      { key: "grade", label: "Applying for", type: "select", required: true, options: GRADES },
      { key: "academic_year", label: "Academic year", type: "select", required: true, options: ["2027-28", "2026-27 (mid-session)"] },
      { key: "campus", label: "Campus", type: "select", required: true, options: "campuses" },
      { key: "child_photo", label: "Recent photograph of the child", type: "file", required: true, help: "Used on the visit pass and the Atlas ID" },
    ],
  },
  {
    id: "guardians",
    title: "Parents and guardians",
    icon: UsersIcon,
    scope: "family",
    repeat: { key: "guardians", one: "Parent or guardian", add: "Add another parent or guardian", min: 1 },
    fields: [
      {
        key: "relationship",
        label: "Relationship to the child",
        type: "select",
        required: true,
        options: [
          { value: "mother", label: "Mother" },
          { value: "father", label: "Father" },
          { value: "guardian", label: "Guardian" },
        ],
      },
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "mobile", label: "Mobile", type: "tel", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "occupation", label: "Occupation", type: "text" },
      { key: "organisation", label: "Organisation", type: "text" },
      {
        key: "qualification",
        label: "Highest qualification",
        type: "select",
        options: [
          { value: "graduate", label: "Graduate" },
          { value: "postgraduate", label: "Postgraduate" },
          { value: "doctorate", label: "Doctorate" },
          { value: "other", label: "Other" },
        ],
      },
      { key: "is_alumnus", label: "Studied at Ardee", type: "toggle" },
      { key: "is_primary", label: "Primary contact for admissions", type: "toggle", help: "Messages and calls go to this person first" },
    ],
  },
  {
    id: "address",
    title: "Home address",
    icon: HouseIcon,
    scope: "family",
    fields: [
      { key: "address_line1", label: "Address line 1", type: "text", required: true },
      { key: "address_line2", label: "Address line 2", type: "text" },
      { key: "locality", label: "Locality", type: "text", required: true },
      { key: "city", label: "City", type: "text", required: true },
      { key: "pin_code", label: "PIN code", type: "text", required: true },
      { key: "state", label: "State", type: "select", required: true, options: ["Delhi", "Haryana", "Uttar Pradesh", "Maharashtra", "Goa", "Other"] },
      { key: "wants_transport", label: "Interested in school transport", type: "toggle" },
    ],
  },
  {
    id: "school",
    title: "Previous schooling",
    icon: BookOpenIcon,
    scope: "child",
    fields: [
      { key: "is_attending_school", label: "Currently attending a school or pre-school", type: "toggle" },
      ...(
        [
          { key: "current_school", label: "School name", type: "text", required: true },
          {
            key: "school_curriculum",
            label: "Curriculum",
            type: "select",
            required: true,
            options: [
              { value: "cambridge", label: "Cambridge" },
              { value: "ib", label: "International Baccalaureate (IB)" },
              { value: "cbse", label: "CBSE" },
              { value: "icse", label: "ICSE" },
              { value: "montessori", label: "Montessori" },
              { value: "other", label: "Other" },
            ],
          },
          { key: "school_class", label: "Current year or class", type: "text", required: true },
          { key: "school_city", label: "City", type: "text" },
          { key: "attending_since", label: "Attending since", type: "select", options: ["2026", "2025", "2024", "2023", "Earlier"] },
          { key: "change_reason", label: "Reason for the change", type: "select", options: ["Relocation", "Curriculum", "Distance", "Fresh start", "Other"] },
          { key: "report_card", label: "Most recent report card", type: "file" },
        ] satisfies FormField[]
      ).map((field) => ({ ...field, when: (v: Values) => !!v.is_attending_school })),
    ],
  },
  {
    id: "siblings",
    title: "Siblings",
    icon: UsersRoundIcon,
    scope: "family",
    fields: [
      { key: "sibling_at_school", label: "A sibling studies at Ardee", type: "toggle" },
      { key: "sibling_name", label: "Sibling's name", type: "text", required: true, when: (v) => !!v.sibling_at_school },
      { key: "sibling_grade", label: "Grade", type: "select", required: true, options: GRADES, when: (v) => !!v.sibling_at_school },
      { key: "sibling_campus", label: "Campus", type: "select", options: "campuses", when: (v) => !!v.sibling_at_school },
    ],
  },
  {
    id: "health",
    title: "Health and support",
    icon: HeartPulseIcon,
    scope: "child",
    fields: [
      {
        key: "blood_group",
        label: "Blood group",
        type: "select",
        options: [
          ...["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => ({ value: g, label: g.replace("-", "−") })),
          { value: "unknown", label: "Not known" },
        ],
      },
      { key: "allergies", label: "Allergies", type: "chips", options: ["None", "Peanuts", "Tree nuts", "Dairy", "Eggs", "Gluten", "Dust", "Pollen", "Other"] },
      { key: "medical_conditions", label: "Medical conditions we should know about", type: "textarea", help: "Shared with the school nurse only" },
      { key: "takes_medication", label: "Takes regular medication", type: "toggle" },
      { key: "medication_details", label: "Medication and timing", type: "textarea", when: (v) => !!v.takes_medication },
      { key: "needs_learning_support", label: "Learning support needs", type: "toggle" },
      { key: "learning_support_details", label: "Tell us more", type: "textarea", when: (v) => !!v.needs_learning_support },
      {
        key: "hearing_sight_needs",
        label: "Hearing or sight needs",
        type: "seg",
        options: [
          { value: "none", label: "None" },
          { value: "hearing_aid", label: "Hearing aid" },
          { value: "glasses", label: "Glasses" },
          { value: "both", label: "Both" },
        ],
        help: "We use this to suggest the right kind of campus visit",
      },
      { key: "paediatrician", label: "Paediatrician's name and number", type: "text" },
    ],
  },
  {
    id: "emergency",
    title: "Emergency contacts",
    icon: PhoneIcon,
    scope: "family",
    repeat: { key: "emergency_contacts", one: "Contact", add: "Add another contact", min: 2 },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "relationship", label: "Relationship", type: "text", required: true },
      { key: "mobile", label: "Mobile", type: "tel", required: true },
    ],
  },
  {
    id: "about",
    title: "About your child",
    icon: SparklesIcon,
    scope: "child",
    fields: [
      { key: "interests", label: "Interests", type: "chips", options: ["Reading", "Football", "Music", "Art", "Dance", "Swimming", "Chess", "Coding", "Theatre", "Nature"] },
      {
        key: "heard_from",
        label: "How did you hear about Ardee?",
        type: "select",
        required: true,
        options: ["Website", "Referral", "Event", "Social media", "Walk-in", "Partner platform", "Other"],
      },
      { key: "school_priorities", label: "What matters most to you in a school?", type: "textarea" },
      { key: "notes_for_counsellor", label: "Anything else you would like us to know", type: "textarea", help: "Optional, and read by your counsellor only" },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    icon: FileTextIcon,
    scope: "child",
    fields: [
      { key: "birth_certificate", label: "Birth certificate", type: "file", required: true },
      { key: "dob_proof", label: "Date of birth proof", type: "file", required: true, help: "Passport or Aadhaar page with the date of birth" },
      { key: "parent_photos", label: "Parent photographs", type: "file", required: true, help: "Used by the gate for verification on visit day" },
      { key: "address_proof", label: "Address proof", type: "file", required: true },
      { key: "report_card", label: "Previous report card", type: "file" },
      { key: "transfer_certificate", label: "Transfer certificate", type: "file", help: "Needed only before joining, not now" },
    ],
  },
  {
    id: "declare",
    title: "Declarations",
    icon: PenLineIcon,
    scope: "child",
    fields: [
      { key: "declared_true", label: "The information given is true and complete", type: "toggle", required: true },
      {
        key: "consent_data",
        label: "Ardee may hold and process this information for admissions",
        type: "toggle",
        required: true,
        help: "Kept per the school policy; you can ask what we hold at any time",
      },
      { key: "consent_photo", label: "Photographs may be used inside the school for identification", type: "toggle", required: true },
      { key: "signature_name", label: "Type your full name as a signature", type: "text", required: true },
    ],
  },
];

/** Answers a section edits: the child's, or the family's (lead) */
export function sectionValues(section: FormSection, lead: Lead, child: Child | null): Values {
  const source: Values = section.scope === "family" ? lead : (child ?? {});
  const uploaded = Object.fromEntries((child?.documents ?? []).map((d) => [d.kind, d]));
  return { ...source, ...uploaded };
}

const isFilled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v === true || typeof v === "number" || (typeof v === "string" && v.trim() !== "") || (!!v && typeof v === "object"));

export const visibleFields = (section: FormSection, values: Values) =>
  section.fields.filter((field) => !field.when || field.when(values));

export interface SectionStats {
  /** Required answers still missing */
  missing: number;
  required: number;
  complete: boolean;
}

export function sectionStats(section: FormSection, lead: Lead, child: Child | null): SectionStats {
  let required = 0;
  let missing = 0;
  const count = (values: Values) =>
    visibleFields(section, values).forEach((field) => {
      if (!field.required) return;
      required++;
      if (!isFilled(values[field.key])) missing++;
    });

  if (section.repeat) {
    const rows = lead[section.repeat.key] as Values[];
    rows.forEach(count);
    // Rows still to add count as their required fields
    const perRow = section.fields.filter((f) => f.required).length;
    const short = Math.max(section.repeat.min - rows.length, 0) * perRow;
    required += short;
    missing += short;
  } else {
    count(sectionValues(section, lead, child));
  }

  return { missing, required, complete: missing === 0 };
}

/** Share of required answers given, 0–100 */
export function formProgress(lead: Lead, child: Child | null) {
  const all = APPLICATION_SECTIONS.map((s) => sectionStats(s, lead, child));
  const required = all.reduce((n, s) => n + s.required, 0);
  const missing = all.reduce((n, s) => n + s.missing, 0);
  return required ? Math.round(((required - missing) / required) * 100) : 100;
}
