import { Suspense } from "react";
import type { Metadata } from "next";
import { VisitorLog } from "@/components/visitor/visitors";

export const metadata: Metadata = { title: "Visitors" };

export default function Page() {
  // Filters and the page are read from the URL, which needs a Suspense boundary
  return (
    <Suspense>
      <VisitorLog />
    </Suspense>
  );
}
