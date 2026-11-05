import type { Metadata } from "next";
import { ScanPass } from "@/components/visitor/gate/scan";

export const metadata: Metadata = { title: "Scan QR" };

export default function Page() {
  return <ScanPass />;
}
