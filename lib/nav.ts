import {
  AlarmClockIcon,
  AlertTriangleIcon,
  ArrowUpDownIcon,
  AwardIcon,
  BadgePercentIcon,
  BarChart2Icon,
  BarChart3Icon,
  BellIcon,
  BookCopyIcon,
  BookMarkedIcon,
  BookOpenCheckIcon,
  BookOpenIcon,
  BookTextIcon,
  Building2Icon,
  BusIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChartNoAxesColumnIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  CombineIcon,
  CreditCardIcon,
  FileBarChartIcon,
  FileCheckIcon,
  FileStackIcon,
  FileTextIcon,
  Flower2Icon,
  FolderIcon,
  GavelIcon,
  GraduationCapIcon,
  GroupIcon,
  HandCoinsIcon,
  HashIcon,
  HeartIcon,
  HomeIcon,
  IdCardIcon,
  HouseIcon,
  InboxIcon,
  IndianRupeeIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  Link2Icon,
  ListChecksIcon,
  ListIcon,
  MailIcon,
  MapIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MessageSquareMoreIcon,
  NotebookIcon,
  NotebookPenIcon,
  NotepadTextIcon,
  PanelTopIcon,
  PercentIcon,
  PianoIcon,
  ProjectorIcon,
  ReceiptIcon,
  Repeat2Icon,
  SaladIcon,
  SchoolIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SlidersIcon,
  SmileIcon,
  SparklesIcon,
  SquarePlusIcon,
  StarIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserCogIcon,
  UserPlusIcon,
  UsersIcon,
  UsersRoundIcon,
  UtensilsCrossedIcon,
  Wand2Icon,
  type LucideIcon,
} from "lucide-react";
import type { Dashboard } from "@/lib/roles";
import type { Me } from "@/schemas/auth.schema";

/**
 * Sidebar navigation, copied item for item from Keyed-frontend src/config/nav/*.nav.ts
 * (student, guardian, mentor, admin, coordinator, finance). transport and admission
 * aren't in Keyed-frontend, so theirs are MyAISee's own.
 */

export interface NavLink {
  name: string;
  /** May carry a query string, e.g. /student/homework?status=all. Unused on submenu parents. */
  href: string;
  icon: LucideIcon;
  beta?: boolean;
  /** Shown locked; `soon` labels why (Keyed's `work`, e.g. "soon", "Ad-on") */
  disabled?: boolean;
  soon?: string;
  submenu?: NavLink[];
}

/** A section label between groups of links */
export interface NavHeading {
  heading: string;
}

export type NavEntry = NavLink | NavHeading;

export const isHeading = (entry: NavEntry): entry is NavHeading => "heading" in entry;

const STUDENT: NavEntry[] = [
  { name: "Today", href: "/student", icon: HouseIcon },
  { name: "Ask Atlas", href: "/student/intelligence", icon: SparklesIcon, beta: true },
  { heading: "Learn" },
  { name: "Classroom", href: "/student/classroom", icon: BookOpenIcon },
  { name: "Homework", href: "/student/homework?status=all", icon: FileTextIcon },
  { name: "Assessments", href: "/student/assessments", icon: ClipboardCheckIcon },
  { name: "Structure of the Day", href: "/student/timetable", icon: CalendarIcon },
  { name: "Resources", href: "/student/resources", icon: FolderIcon },
  { name: "Report Cards", href: "/student/report-cards", icon: NotepadTextIcon },
  { name: "Cambridge Textbooks", href: "/student/cambridge-textbooks", icon: NotebookIcon },
  { name: "Daily Summary", href: "/student/daily-summary", icon: CalendarIcon, beta: true },
  { heading: "Plan" },
  { name: "Planner", href: "/student/journal", icon: PanelTopIcon },
  { name: "Calendar", href: "/student/calendar", icon: CalendarDaysIcon },
  { name: "Your Week", href: "/student/weekly-updates", icon: ChartNoAxesColumnIcon },
  { heading: "Campus" },
  { name: "Attendance", href: "/student/attendance", icon: CircleCheckIcon },
  { name: "Forums", href: "/student/forums", icon: UsersRoundIcon },
  { name: "Earth café", href: "/student/earth-cafe", icon: UtensilsCrossedIcon },
  { name: "Lost and Found", href: "/student/lost-and-found", icon: SearchIcon, disabled: true, soon: "soon" },
  { name: "University Guidance", href: "/student/university", icon: ArrowUpDownIcon, disabled: true },
  { heading: "Inbox" },
  { name: "Messages", href: "/student/conversations", icon: MessageSquareIcon },
  { name: "Announcements", href: "/student/announcements", icon: MegaphoneIcon },
  { name: "Notifications", href: "/student/notifications", icon: BellIcon },
  { heading: "Wellbeing" },
  { name: "Check-in", href: "/student/mindfulness", icon: HeartIcon },
  { name: "Health Room", href: "/student/health-room", icon: SquarePlusIcon },
];

// Payments is only offered on this campus (Keyed-frontend guardian.nav.ts PAYMENTS_CAMPUS_ID)
const GUARDIAN_PAYMENTS_HREF = "/guardian/payments";
const GUARDIAN_PAYMENTS_CAMPUS_ID = 3;

const GUARDIAN: NavEntry[] = [
  { name: "Home", href: "/guardian", icon: HomeIcon },
  { name: "Ask Atlas", href: "/guardian/intelligence", icon: SparklesIcon, beta: true },
  { heading: "My Ardee" },
  {
    name: "Learning",
    href: "/guardian/learning",
    icon: BookOpenIcon,
    submenu: [
      { name: "Overview", href: "/guardian/overview", icon: BookOpenIcon },
      { name: "Structure of the Day", href: "/guardian/timetable", icon: BookOpenIcon },
      { name: "Homework", href: "/guardian/homework?status=pending", icon: BookOpenIcon },
      { name: "Resources", href: "/guardian/resources", icon: BookOpenIcon },
      { name: "Report Card", href: "/guardian/report-card", icon: BookOpenIcon },
      { name: "Portfolio", href: "/guardian/portfolio", icon: LibraryIcon },
      { name: "Cambridge Textbooks", href: "/guardian/cambridge-textbooks", icon: NotebookIcon },
      { name: "Weekly Update", href: "/guardian/weekly-updates", icon: CalendarIcon },
      { name: "Daily Summary", href: "/guardian/daily-summary", icon: LibraryIcon, beta: true },
      { name: "Forums", href: "/guardian/forums", icon: UsersIcon },
      { name: "Progress Timeline", href: "/guardian/programs", icon: LibraryIcon, disabled: true },
      { name: "Studio", href: "/guardian/studio", icon: PianoIcon, disabled: true },
    ],
  },
  {
    name: "Campus",
    href: "/guardian/campus",
    icon: Building2Icon,
    submenu: [
      { name: "Attendance", href: "/guardian/attendance", icon: LayersIcon },
      { name: "Absence Form", href: "/guardian/absence-form", icon: FileTextIcon },
      { name: "Transport", href: "/guardian/transport", icon: BusIcon },
      { name: "Earth café", href: "/guardian/earth-cafe", icon: UtensilsCrossedIcon },
      { name: "Calendar", href: "/guardian/events", icon: CalendarIcon },
      { name: "Behavior Log", href: "/guardian/behavior-logs", icon: LibraryIcon },
      { name: "VR Tour", href: "/guardian/vr-tour", icon: ProjectorIcon },
      { name: "Fee", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
      { name: "Lost & Found", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
    ],
  },
  {
    name: "Inbox",
    href: "/guardian/inboxMessage",
    icon: MessageSquareMoreIcon,
    submenu: [
      { name: "Messages", href: "/guardian/communication", icon: MessageSquareMoreIcon },
      { name: "Announcements", href: "/guardian/announcements", icon: MegaphoneIcon },
    ],
  },
  { name: "Payments", href: GUARDIAN_PAYMENTS_HREF, icon: CreditCardIcon },
];

const MENTOR: NavEntry[] = [
  { name: "Home", href: "/mentor", icon: HomeIcon },
  { name: "Ask Atlas", href: "/mentor/intelligence", icon: SparklesIcon, beta: true },
  { heading: "My Classes" },
  {
    name: "Teach",
    href: "/mentor/teach",
    icon: BookOpenIcon,
    submenu: [
      { name: "Attendance", href: "/mentor/attendance", icon: ClipboardListIcon },
      { name: "Homework", href: "/mentor/homework", icon: FileTextIcon },
      { name: "Assessments", href: "/mentor/assessments", icon: BarChart2Icon },
      { name: "Lesson Plans", href: "/mentor/lessons", icon: BookOpenIcon },
      { name: "Resources", href: "/mentor/resources", icon: LayersIcon },
      { name: "Syllabus", href: "/mentor/syllabus", icon: LayersIcon },
      { name: "Rubrics", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
      { name: "Unit Planner", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
    ],
  },
  {
    name: "Grade",
    href: "/mentor/grade",
    icon: CalendarDaysIcon,
    submenu: [
      { name: "Grade Book", href: "/mentor/grade-book", icon: BookMarkedIcon },
      { name: "Report Cards", href: "/mentor/report-cards", icon: FileTextIcon },
      { name: "Weekly Update", href: "/mentor/weekly-updates", icon: CalendarDaysIcon },
    ],
  },
  {
    name: "Students",
    href: "/mentor/students-info",
    icon: UsersIcon,
    submenu: [
      { name: "All Students", href: "/mentor/students", icon: UsersIcon },
      { name: "At-Risk", href: "/mentor/students/at-risk", icon: AlertTriangleIcon },
      { name: "Behaviour Log", href: "/mentor/behaviour-log", icon: AlertTriangleIcon },
      { name: "Absence Requests", href: "/mentor/absence-request", icon: FileTextIcon },
      { name: "Seating Plan", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
      { name: "Portfolio Review", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
    ],
  },
  {
    name: "Inbox",
    href: "/mentor/inboxMessage",
    icon: MessageSquareMoreIcon,
    submenu: [
      { name: "Post Announcement", href: "/mentor/announcements", icon: MegaphoneIcon },
      { name: "Announcement Inbox", href: "/mentor/announcements/inbox", icon: InboxIcon },
      { name: "Parent Messages", href: "/mentor/communication/parents", icon: TrendingUpIcon },
      { name: "Student Messages", href: "/mentor/communication/students", icon: AlertTriangleIcon },
    ],
  },
  { heading: "School" },
  {
    name: "School Life",
    href: "/mentor/school-life",
    icon: SchoolIcon,
    submenu: [
      { name: "Planner", href: "/mentor/todo", icon: NotebookPenIcon },
      { name: "Calendar", href: "/mentor/calendar", icon: CalendarDaysIcon },
      { name: "Forums", href: "/mentor/forums", icon: UsersIcon },
      { name: "Earth café", href: "/mentor/earth-cafe", icon: SaladIcon },
      { name: "Community", href: "/mentor/community", icon: HeartIcon },
      { name: "Conference Bookings", href: "", icon: SaladIcon, disabled: true, soon: "soon" },
      { name: "House", href: "/mentor/house", icon: HouseIcon, disabled: true, soon: "Ad-on" },
    ],
  },
];

const ADMIN: NavEntry[] = [
  { name: "Home", href: "/admin", icon: HomeIcon },
  { name: "Ask Atlas", href: "/admin/intelligence", icon: SparklesIcon, beta: true },
  { heading: "Understand" },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3Icon,
    submenu: [
      { name: "Adoption", href: "/admin/analytics/adoption", icon: TrendingUpIcon },
      { name: "Students", href: "/admin/analytics/students", icon: UsersIcon },
      { name: "Parents", href: "/admin/analytics/parents", icon: HeartIcon },
      { name: "Mentors", href: "/admin/analytics/mentors", icon: BookOpenIcon },
      { name: "Coordinators", href: "/admin/analytics/coordinators", icon: ClipboardCheckIcon, disabled: true },
      { name: "Features", href: "/admin/analytics/features", icon: LayersIcon, disabled: true },
      { name: "Communication", href: "/admin/analytics/communication", icon: MegaphoneIcon },
      { name: "Academic", href: "/admin/analytics/academic", icon: AwardIcon, disabled: true },
      { name: "Atlas Success", href: "/admin/analytics/success", icon: TrophyIcon, disabled: true },
    ],
  },
  { heading: "Run the school" },
  {
    name: "People",
    href: "/admin/people",
    icon: UsersIcon,
    submenu: [
      { name: "Students", href: "/admin/students", icon: UserCogIcon },
      { name: "Guardians", href: "/admin/guardians", icon: UserCogIcon },
      { name: "Teachers", href: "/admin/teachers", icon: UserCogIcon },
      { name: "Coordinators", href: "/admin/coordinators", icon: UserCogIcon },
      { name: "School admins", href: "/admin/coordinators", icon: UserCogIcon, disabled: true },
    ],
  },
  {
    name: "Structure",
    href: "/admin/structure",
    icon: Building2Icon,
    submenu: [
      { name: "Campuses", href: "/admin/campuses", icon: Building2Icon },
      { name: "Academic Years", href: "/admin/academic-years", icon: CalendarDaysIcon },
      { name: "Terms", href: "/admin/terms", icon: BookTextIcon },
      { name: "Grades", href: "/admin/grades", icon: HashIcon },
      { name: "Sections", href: "/admin/sections", icon: LayersIcon },
      { name: "Classes", href: "/admin/classes", icon: BookOpenIcon },
      { name: "Marking Schemes", href: "/admin/marking-schemes", icon: ListChecksIcon },
      { name: "Programs", href: "/admin/curriculum/programs", icon: LibraryIcon },
      { name: "Attendance Devices", href: "/admin/attendance-devices", icon: ShieldCheckIcon },
      { name: "Transport", href: "/admin/transport", icon: BusIcon },
      { name: "Earth Cafe", href: "/admin/earth-cafe", icon: UtensilsCrossedIcon },
    ],
  },
  {
    name: "Curriculum",
    href: "/admin/curriculum",
    icon: BookCopyIcon,
    submenu: [
      { name: "Subjects", href: "/admin/curriculum/subjects", icon: BookOpenIcon },
      { name: "Subject Versions", href: "/admin/curriculum/subject-versions", icon: LayersIcon },
      { name: "Subject Offering", href: "/admin/subject-allocation", icon: Link2Icon },
      { name: "Subject Groups", href: "/admin/curriculum/subject-groups", icon: GroupIcon },
      { name: "Home Assignment", href: "/admin/curriculum/home-assignment-schedule", icon: CalendarDaysIcon },
      { name: "Marking Schemes", href: "/admin/curriculum/subject-groups", icon: GroupIcon, disabled: true },
      { name: "Enrichments", href: "/admin/curriculum/enrichments", icon: Flower2Icon },
      { name: "SOD Plans", href: "/admin/curriculum/sod-plans", icon: FileTextIcon },
      { name: "Chapters", href: "/admin/curriculum/chapters", icon: BookTextIcon },
      { name: "Topics", href: "/admin/curriculum/topics", icon: ListIcon },
      { name: "Weekly Updates", href: "/admin/curriculum/weekly-updates", icon: CalendarDaysIcon },
      { name: "Programs", href: "/admin/curriculum/topics", icon: ListIcon, disabled: true },
    ],
  },
  {
    name: "Timetable",
    href: "/admin/timetable",
    icon: CalendarDaysIcon,
    submenu: [
      { name: "View Timetable", href: "/admin/timetable/view", icon: CalendarDaysIcon },
      { name: "Generation", href: "/admin/timetable/generation", icon: Wand2Icon },
      { name: "Year Structure", href: "/admin/timetable/year-structure", icon: SlidersIcon },
      { name: "Time Slots", href: "/admin/timetable/time-slots", icon: ClockIcon },
      { name: "Period Requirements", href: "/admin/timetable/period-requirements", icon: CalendarDaysIcon },
      { name: "Subject Combinations", href: "/admin/timetable/subject-combinations", icon: CombineIcon },
      { name: "Subject Requirements", href: "/admin/timetable/subject-requirements", icon: StarIcon },
      { name: "Activities", href: "/admin/timetable/activities", icon: SparklesIcon },
    ],
  },
  {
    name: "Communication",
    href: "/admin/communication",
    icon: MegaphoneIcon,
    submenu: [
      { name: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon },
      { name: "Calendar", href: "/admin/calendar", icon: CalendarDaysIcon },
      { name: "Forum Requests", href: "/admin/forums", icon: UsersIcon },
      { name: "Mood Questions", href: "/admin/wellbeing/mood-questions", icon: SmileIcon },
      { name: "Wellbeing Nudges", href: "/admin/wellbeing/nudges", icon: SparklesIcon },
      { name: "What's New", href: "/admin/whats-new", icon: SparklesIcon },
    ],
  },
];

const COORDINATOR: NavEntry[] = [
  { name: "Home", href: "/coordinator", icon: HomeIcon },
  { name: "Ask Atlas", href: "/coordinator/intelligence", icon: SparklesIcon, beta: true },
  { heading: "Run the day" },
  { name: "Attendance", href: "/coordinator/attendance", icon: ClipboardCheckIcon },
  { name: "Calendar", href: "/coordinator/calendar", icon: CalendarDaysIcon },
  { name: "Substitutions", href: "/coordinator/substitutions", icon: Repeat2Icon },
  { name: "Homework", href: "/coordinator/homework", icon: BookOpenCheckIcon },
  { name: "Earth Cafe", href: "/coordinator/earth-cafe", icon: UtensilsCrossedIcon },
  { heading: "Review and approve" },
  { name: "Assessments", href: "/coordinator/assessments", icon: FileCheckIcon },
  { name: "Resources", href: "/coordinator/resources", icon: FileTextIcon },
  { name: "Forum Requests", href: "/coordinator/forums", icon: UsersIcon },
  { heading: "School" },
  { name: "Community", href: "/coordinator/community", icon: HeartIcon },
  { name: "Report Cards", href: "/coordinator/report-cards", icon: NotebookPenIcon },
  {
    name: "Communication",
    href: "/coordinator/communication",
    icon: MegaphoneIcon,
    submenu: [
      { name: "Announcements", href: "/coordinator/announcements", icon: MegaphoneIcon },
      { name: "What's New", href: "/coordinator/whats-new", icon: SparklesIcon },
      { name: "Parent Messages", href: "/coordinator/communication/parents", icon: MailIcon },
      { name: "Student Messages", href: "/coordinator/communication/students", icon: GraduationCapIcon },
    ],
  },
];

const FINANCE: NavEntry[] = [
  { name: "Home", href: "/finance", icon: HomeIcon },
  { name: "Ask Atlas", href: "/finance/intelligence", icon: SparklesIcon, beta: true, disabled: true },
  { heading: "Collect" },
  {
    name: "Collections",
    href: "/finance/collections",
    icon: IndianRupeeIcon,
    submenu: [
      { name: "Invoices", href: "/finance/invoices", icon: FileStackIcon },
      { name: "Fee Receipts", href: "/finance/receipts", icon: ReceiptIcon },
      { name: "Late Fee Policies", href: "/finance/late-fee-policies", icon: ShieldIcon },
      { name: "Late Fee Defaulters", href: "/finance/late-fee-defaulters", icon: AlarmClockIcon },
      { name: "Fee Summary", href: "/finance/student-fees", icon: FileBarChartIcon },
      { name: "Reminders", href: "/finance/refunds", icon: GavelIcon, disabled: true },
    ],
  },
  { heading: "Set up" },
  {
    name: "Contribution set-up",
    href: "/finance/contribution-set-up",
    icon: LayersIcon,
    submenu: [
      { name: "Fee Component", href: "/finance/fee-component", icon: LayersIcon },
      { name: "Fee Structures", href: "/finance/fee-structure", icon: LayoutDashboardIcon },
      { name: "Fee Terms", href: "/finance/fee-terms", icon: ClockIcon },
      { name: "Fee Batch", href: "/finance/fee-batch", icon: GroupIcon },
      { name: "Optional Fees", href: "/finance/optional-fees", icon: StarIcon },
    ],
  },
  {
    name: "Adjustments",
    href: "/finance/adjustments",
    icon: PercentIcon,
    submenu: [
      { name: "Concessions", href: "/finance/concessions", icon: BadgePercentIcon },
      { name: "Waivers", href: "/finance/waivers", icon: HandCoinsIcon },
      { name: "Fine Carry Forwards", href: "/finance/fine-carry-forwards", icon: GavelIcon },
      { name: "Refunds", href: "/finance/refunds", icon: GavelIcon, disabled: true },
    ],
  },
  { heading: "Control" },
  {
    name: "Control",
    href: "",
    icon: SettingsIcon,
    submenu: [
      { name: "Reports", href: "", icon: BadgePercentIcon, disabled: true },
      { name: "Checks", href: "", icon: HandCoinsIcon, disabled: true },
      { name: "Settings", href: "", icon: GavelIcon, disabled: true },
      { name: "Activity log", href: "", icon: GavelIcon, disabled: true },
      { name: "Period close", href: "", icon: GavelIcon, disabled: true },
      { name: "Bank reconciliation", href: "", icon: GavelIcon, disabled: true },
      { name: "Roles and permissions", href: "", icon: GavelIcon, disabled: true },
    ],
  },
];

const TRANSPORT: NavEntry[] = [
  { name: "Home", href: "/transport", icon: HomeIcon },
  { heading: "Operate" },
  { name: "Routes", href: "/transport/routes", icon: MapIcon },
  { name: "Vehicles", href: "/transport/vehicles", icon: BusIcon },
  { name: "Pick-up points", href: "/transport/stops", icon: MapIcon, disabled: true, soon: "soon" },
];

const ADMISSION: NavEntry[] = [
  { name: "Desk", href: "/admission", icon: HomeIcon },
  { heading: "Families" },
  { name: "Applications", href: "/admission/applications", icon: ClipboardListIcon },
  { name: "Enquiries", href: "/admission/leads", icon: UserPlusIcon },
  { name: "Visits", href: "/admission/visits", icon: CalendarCheckIcon },
  { heading: "Set up" },
  // { name: "Fee plans", href: "/admission/fee-plans", icon: IndianRupeeIcon },
  { name: "Visit slots", href: "/admission/slots", icon: CalendarDaysIcon },
];

const VISITOR: NavEntry[] = [
  { name: "Today's Visitor", href: "/visitor", icon: HomeIcon },
  { name: "Gate dashboard", href: "/visitor/dashboard", icon: LayoutDashboardIcon },
  { heading: "Today" },
  { name: "Visitor log", href: "/visitor/visitors", icon: IdCardIcon },
  { name: "Admission visits", href: "/visitor/admissions", icon: CalendarCheckIcon },
];

export const NAV: Record<Dashboard, NavEntry[]> = {
  student: STUDENT,
  guardian: GUARDIAN,
  mentor: MENTOR,
  admin: ADMIN,
  coordinator: COORDINATOR,
  finance: FINANCE,
  transport: TRANSPORT,
  admission: ADMISSION,
  visitor: VISITOR,
};

/** A dashboard's nav for this user (guardian Payments is campus-specific) */
export function navFor(dashboard: Dashboard, me: Me): NavEntry[] {
  const nav = NAV[dashboard];
  if (dashboard !== "guardian" || me.campus === GUARDIAN_PAYMENTS_CAMPUS_ID) return nav;
  return nav.filter((entry) => isHeading(entry) || entry.href !== GUARDIAN_PAYMENTS_HREF);
}

/** "/student/homework?status=all" -> "/student/homework" */
export const pathOf = (href: string) => href.split("?")[0].replace(/\/+$/, "") || "/";

/** Active when on the link's page or anywhere below it; a dashboard home only on itself */
export function isActive(pathname: string, href: string, dashboardHome: string) {
  if (!href) return false;
  const target = pathOf(href);
  const current = pathOf(pathname);
  if (target === dashboardHome) return current === dashboardHome;
  return current === target || current.startsWith(`${target}/`);
}

/** Every page a sidebar link opens, for routes and titles. Submenu parents only expand. */
export function navPages(dashboard: Dashboard) {
  const pages = new Map<string, NavLink>();
  const add = (link: NavLink) => {
    if (link.submenu) return link.submenu.forEach(add);
    if (link.href && !link.disabled) pages.set(pathOf(link.href), link);
  };
  NAV[dashboard].forEach((entry) => !isHeading(entry) && add(entry));
  return pages;
}
