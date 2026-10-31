import type { Metadata } from "next";
import { Slots } from "@/components/admission/slots";

export const metadata: Metadata = { title: "Visit slots" };

export default function Page() {
  return <Slots />;
}
