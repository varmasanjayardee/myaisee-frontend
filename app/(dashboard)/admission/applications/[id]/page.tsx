import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ApplicationDetailView } from "@/components/admission/application-detail";

export default function Page({ params }: PageProps<"/admission/applications/[id]">) {
  // The id is URL data: read it inside Suspense so the shared shell stays URL-independent
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/admission/applications/[id]">, "params">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ApplicationDetailView id={id} />;
}
