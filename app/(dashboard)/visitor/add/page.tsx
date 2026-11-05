import type { Metadata } from "next";
import { ChooseVisitorType } from "@/components/visitor/gate/add";

export const metadata: Metadata = { title: "Add visitor" };

export default function Page() {
  return <ChooseVisitorType />;
}
