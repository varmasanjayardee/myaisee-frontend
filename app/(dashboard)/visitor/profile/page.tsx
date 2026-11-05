import type { Metadata } from "next";
import { GateProfile } from "@/components/visitor/gate/profile";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <GateProfile />;
}
