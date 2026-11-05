import { Suspense } from "react";
import { notFound } from "next/navigation";
import { VisitPass } from "@/components/visitor/gate/pass";

export default function Page({ params }: PageProps<"/visitor/pass/[id]">) {
  // The id is URL data: read it inside Suspense so the shared shell stays URL-independent
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/visitor/pass/[id]">, "params">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <VisitPass id={id} />;
}
