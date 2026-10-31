import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LeadWorkspace } from "@/components/admission/lead-workspace";

export default function Page({ params }: PageProps<"/admission/leads/[id]">) {
  // The id is URL data: read it inside Suspense so the shared shell stays URL-independent
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/admission/leads/[id]">, "params">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <LeadWorkspace id={id} />;
}
