import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("finance");

export default function Page({ params }: PageProps<"/finance/[...section]">) {
  return <SectionRoute dashboard="finance" params={params} />;
}
