import type { Metadata } from "next";
import { GateToday } from "@/components/visitor/gate/home";

export const metadata: Metadata = { title: "Today's Visitor" };

export default function Page() {
  return <GateToday />;
}
