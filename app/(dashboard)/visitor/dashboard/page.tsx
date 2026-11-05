import type { Metadata } from "next";
import { GateHome } from "@/components/visitor/dashboard";

export const metadata: Metadata = { title: "Gate" };

export default function Page() {
  return <GateHome />;
}
