import { SectionRoute, sectionParams } from "@/components/portal/section-page";

export const generateStaticParams = () => sectionParams("student");

export default function Page({ params }: PageProps<"/student/[...section]">) {
  return <SectionRoute dashboard="student" params={params} />;
}
