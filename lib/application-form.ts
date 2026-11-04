import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  FileTextIcon,
  HeartPulseIcon,
  HouseIcon,
  MessageCircleQuestionIcon,
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
  /** Filled from the API: "campuses", or "academic_years"/"grades" (the chosen campus's schools.AcademicYear rows / the grades it admits) */
  options?: readonly Option[] | "campuses" | "academic_years" | "grades";
  help?: string;
  /** select: type to search the options; only an option can be kept */
  search?: boolean;
  /** chips: values can also be typed in */
  addable?: boolean;
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

// GOV.UK list of nationalities (gov.uk/government/publications/nationalities), Indian first
const NATIONALITIES = [
  "Indian",
  "Overseas Citizen of India",
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Anguillan", "Citizen of Antigua and Barbuda", "Argentine", "Armenian",
  "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese",
  "Bermudian", "Bhutanese", "Bolivian", "Citizen of Bosnia and Herzegovina", "Botswanan", "Brazilian", "British", "British Virgin Islander",
  "Bruneian", "Bulgarian", "Burkinan", "Burmese", "Burundian", "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Cayman Islander",
  "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese (Congo)", "Congolese (DRC)", "Cook Islander", "Costa Rican",
  "Croatian", "Cuban", "Cymraes", "Cymro", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Citizen of the Dominican Republic", "Dutch",
  "East Timorese", "Ecuadorean", "Egyptian", "Emirati", "English", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Faroese", "Fijian",
  "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Gibraltarian", "Greek", "Greenlandic", "Grenadian",
  "Guamanian", "Guatemalan", "Citizen of Guinea-Bissau", "Guinean", "Guyanese", "Haitian", "Honduran", "Hong Konger", "Hungarian", "Icelandic",
  "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakh", "Kenyan", "Kittitian",
  "Citizen of Kiribati", "Kosovan", "Kuwaiti", "Kyrgyz", "Lao", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtenstein citizen", "Lithuanian",
  "Luxembourger", "Macanese", "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese", "Martiniquais",
  "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan", "Monegasque", "Mongolian", "Montenegrin", "Montserratian", "Moroccan", "Mosotho",
  "Mozambican", "Namibian", "Nauruan", "Nepalese", "New Zealander", "Nicaraguan", "Nigerian", "Nigerien", "Niuean", "North Korean", "Northern Irish",
  "Norwegian", "Omani", "Pakistani", "Palauan", "Palestinian", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Pitcairn Islander",
  "Polish", "Portuguese", "Prydeinig", "Puerto Rican", "Qatari", "Romanian", "Russian", "Rwandan", "Salvadorean", "Sammarinese", "Samoan",
  "Sao Tomean", "Saudi Arabian", "Scottish", "Senegalese", "Serbian", "Citizen of Seychelles", "Sierra Leonean", "Singaporean", "Slovak",
  "Slovenian", "Solomon Islander", "Somali", "South African", "South Korean", "South Sudanese", "Spanish", "Sri Lankan", "St Helenian", "St Lucian",
  "Stateless", "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan",
  "Trinidadian", "Tristanian", "Tunisian", "Turkish", "Turkmen", "Turks and Caicos Islander", "Tuvaluan", "Ugandan", "Ukrainian", "Uruguayan",
  "Uzbek", "Vatican citizen", "Citizen of Vanuatu", "Venezuelan", "Vietnamese", "Vincentian", "Wallisian", "Welsh", "Yemeni", "Zambian",
  "Zimbabwean",
];
const LANGUAGES = ["English", "Hindi", "Punjabi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Malayalam", "Kannada", "Urdu", "Other"];
const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
/** Every grade, in order; same as GRADE_LABEL/GRADE_STAGE in keyed-backend admission/models.py. Each campus admits some of them (`campus.grades`) */
export const GRADES = [
  { value: "Early NIDO/NIDO", label: "Early NIDO/NIDO (8 to 18 months)", stage: "Early Years" },
  { value: "Red", label: "Red (2+ years)", stage: "Early Years" },
  { value: "Blue", label: "Blue (3+ years)", stage: "Early Years" },
  { value: "Yellow", label: "Yellow (4+ years)", stage: "Early Years" },
  { value: "EYFS", label: "EYFS (5+ years)", stage: "Early Years" },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: `Year ${i + 1}`,
    label: `Year ${i + 1}`,
    stage: i < 6 ? "Primary" : i < 9 ? "Lower Secondary" : "Upper Secondary (IGCSE)",
  })),
];

/** Cambridge stage per grade */
export const GRADE_STAGE_LABEL: Record<string, string> = Object.fromEntries(GRADES.map((g) => [g.value, g.stage]));

export const APPLICATION_SECTIONS: FormSection[] = [
  {
    id: "child",
    title: "Child",
    icon: UserIcon,
    scope: "child",
    fields: [
      { key: "campus", label: "Campus", type: "select", required: true, options: "campuses" },
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
      { key: "nationality", label: "Nationality", type: "select", required: true, search: true, options: NATIONALITIES },
      { key: "mother_tongue", label: "Mother tongue", type: "select", required: true, options: LANGUAGES },
      { key: "home_languages", label: "Languages spoken at home", type: "chips", required: true, addable: true, options: LANGUAGES.slice(0, 8) },
      { key: "grade", label: "Applying for", type: "select", required: true, options: "grades", help: "Choose the campus first" },
      { key: "academic_year", label: "Academic year", type: "select", required: true, options: "academic_years", help: "Choose the campus first" },
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
    id: "questions",
    title: "Questions for parents",
    icon: MessageCircleQuestionIcon,
    scope: "child",
    fields: [
      { key: "reason_to_join", label: "Why would you like your child to join Ardee?", type: "textarea", required: true },
      { key: "family_note", label: "If offered admission, what would you like the school to know about you?", type: "textarea", required: true },
      { key: "parent_works_in_school", label: "Either parent owns or works in a school", type: "toggle" },
      {
        key: "parent_school_details",
        label: "Name, role and address of the school",
        type: "textarea",
        required: true,
        when: (v) => !!v.parent_works_in_school,
      },
      { key: "father_work", label: "Father: the nature of your work and key responsibilities at your organisation", type: "textarea", required: true },
      { key: "mother_work", label: "Mother: the nature of your work and key responsibilities at your organisation", type: "textarea", required: true },
      {
        key: "consent_programs",
        label: "We will support and consent to the school's programmes, internal and external",
        type: "toggle",
        required: true,
        help: "Such as camps, MUNs, college bridge programme visits and others the school feels will enrich your child's education",
      },
      {
        key: "confirm_workshops",
        label: "We will attend the parent and school workshops",
        type: "toggle",
        help: "The school expects at least 80% attendance",
      },
      { key: "standardized_test", label: "Has your child completed a standardised test? (for example SAT, Subject Aptitude Test)", type: "seg", required: true, options: YES_NO },
      { key: "disciplinary_action", label: "Has any disciplinary action been taken on your child at a previous school?", type: "seg", required: true, options: YES_NO },
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
