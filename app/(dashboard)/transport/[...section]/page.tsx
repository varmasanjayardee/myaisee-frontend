import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("transport");

export default function Page({ params }: PageProps<"/transport/[...section]">) {
  return <SectionRoute dashboard="transport" params={params} />;
}
