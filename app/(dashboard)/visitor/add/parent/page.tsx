import type { Metadata } from "next";
import { ParentFlow } from "@/components/visitor/gate/add";

export const metadata: Metadata = { title: "Parent visitor" };

export default function Page() {
  return <ParentFlow />;
}
