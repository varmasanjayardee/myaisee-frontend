import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("coordinator");

export default function Page({ params }: PageProps<"/coordinator/[...section]">) {
  return <SectionRoute dashboard="coordinator" params={params} />;
}
