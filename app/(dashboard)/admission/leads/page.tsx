import type { Metadata } from "next";
import { Leads } from "@/components/admission/leads";

export const metadata: Metadata = { title: "Enquiries" };

export default function Page() {
  return <Leads />;
}
