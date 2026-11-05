import { Suspense } from "react";
import type { Metadata } from "next";
import { GeneralFlow } from "@/components/visitor/gate/add";

export const metadata: Metadata = { title: "General visitor" };

export default function Page() {
  // Reads the number passed on from the parent flow in the URL, which needs a Suspense boundary
  return (
    <Suspense>
      <GeneralFlow />
    </Suspense>
  );
}
