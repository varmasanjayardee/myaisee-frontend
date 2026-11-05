import type { Metadata } from "next";
import { PersonalInformation } from "@/components/visitor/gate/profile";

export const metadata: Metadata = { title: "Personal Information" };

export default function Page() {
  return <PersonalInformation />;
}
