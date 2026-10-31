import { Suspense } from "react";
import type { Metadata } from "next";
import { ApplicationList } from "@/components/admission/applications";

export const metadata: Metadata = { title: "Applications" };

export default function Page() {
  // Filters are read from the URL, which needs a Suspense boundary
  return (
    <Suspense>
      <ApplicationList />
    </Suspense>
  );
}
