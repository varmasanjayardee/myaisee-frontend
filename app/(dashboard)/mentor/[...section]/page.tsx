import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("mentor");

export default function Page({ params }: PageProps<"/mentor/[...section]">) {
  return <SectionRoute dashboard="mentor" params={params} />;
}
