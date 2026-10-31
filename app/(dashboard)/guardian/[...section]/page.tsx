import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("guardian");

export default function Page({ params }: PageProps<"/guardian/[...section]">) {
  return <SectionRoute dashboard="guardian" params={params} />;
}
