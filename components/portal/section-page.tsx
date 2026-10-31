import { Suspense } from "react";
import { notFound } from "next/navigation";
import { navPages } from "@/lib/nav";
import { dashboardHref, type Dashboard } from "@/lib/roles";

type SectionParams = Promise<{ section: string[] }>;

/**
 * A dashboard's [...section] page. The URL is read inside <Suspense>, so the shared
 * App Shell stays URL-independent (Next's instant-shell-url-data check).
 */
export function SectionRoute({ dashboard, params }: { dashboard: Dashboard; params: SectionParams }) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <SectionPage dashboard={dashboard} params={params} />
    </Suspense>
  );
}

/** Placeholder for every sidebar page until each gets its own route */
async function SectionPage({ dashboard, params }: { dashboard: Dashboard; params: SectionParams }) {
  const { section } = await params;
  const link = navPages(dashboard).get(`${dashboardHref(dashboard)}/${section.join("/")}`);
  if (!link) notFound();
  const Icon = link.icon;

  return (
    <section className="max-w-xl">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{link.name}</h1>
      <p className="mt-2 text-muted-foreground">This page is on its way.</p>
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div aria-busy className="max-w-xl animate-pulse motion-reduce:animate-none">
      <span className="block size-12 rounded-2xl bg-muted" />
      <span className="mt-4 block h-7 w-48 rounded-md bg-muted" />
      <span className="mt-3 block h-5 w-64 rounded-md bg-muted" />
    </div>
  );
}

/** generateStaticParams for a dashboard's [...section] route: every page in its nav */
export const sectionParams = (dashboard: Dashboard) =>
  [...navPages(dashboard).keys()]
    .filter((path) => path !== dashboardHref(dashboard))
    .map((path) => ({ section: path.slice(dashboardHref(dashboard).length + 1).split("/") }));
