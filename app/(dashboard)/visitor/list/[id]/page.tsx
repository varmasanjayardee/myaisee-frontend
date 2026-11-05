import { Suspense } from "react";
import { notFound } from "next/navigation";
import { VisitorDetail } from "@/components/visitor/gate/list";

export default function Page({ params }: PageProps<"/visitor/list/[id]">) {
  // The id is URL data: read it inside Suspense so the shared shell stays URL-independent
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/visitor/list/[id]">, "params">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <VisitorDetail id={id} />;
}
