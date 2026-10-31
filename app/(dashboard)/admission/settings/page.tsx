import type { Metadata } from "next";
import { StaffProfileView } from "@/components/admission/profile";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <StaffProfileView />;
}
