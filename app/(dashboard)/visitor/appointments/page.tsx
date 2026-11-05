import type { Metadata } from "next";
import { AppointmentList } from "@/components/visitor/gate/list";

export const metadata: Metadata = { title: "Appointments" };

export default function Page() {
  return <AppointmentList />;
}
