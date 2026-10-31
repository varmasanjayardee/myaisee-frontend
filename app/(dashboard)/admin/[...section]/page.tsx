import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("admin");

export default function Page({ params }: PageProps<"/admin/[...section]">) {
  return <SectionRoute dashboard="admin" params={params} />;
}
