import type { Metadata } from "next";
import { FeePlans } from "@/components/admission/fee-plans";

export const metadata: Metadata = { title: "Fee plans" };

export default function Page() {
  return <FeePlans />;
}
