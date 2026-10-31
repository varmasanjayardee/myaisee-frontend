import type { Metadata } from "next";
import { AdmissionDesk } from "@/components/admission/desk";

export const metadata: Metadata = { title: "Admissions desk" };

export default function Page() {
  return <AdmissionDesk />;
}
