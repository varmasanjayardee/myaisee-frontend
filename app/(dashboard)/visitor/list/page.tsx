import type { Metadata } from "next";
import { VisitorList } from "@/components/visitor/gate/list";

export const metadata: Metadata = { title: "Visitor List" };

export default function Page() {
  return <VisitorList />;
}
