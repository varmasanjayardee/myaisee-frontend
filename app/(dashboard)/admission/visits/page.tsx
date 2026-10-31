import { Suspense } from "react";
import type { Metadata } from "next";
import { VisitsList } from "@/components/admission/visits";

export const metadata: Metadata = { title: "Visits" };

export default function Page() {
  // Filters and the page are read from the URL, which needs a Suspense boundary
  return (
    <Suspense>
      <VisitsList />
    </Suspense>
  );
}
