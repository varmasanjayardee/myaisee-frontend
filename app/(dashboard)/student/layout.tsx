import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/student">) {
  return <RoleShell dashboard="student">{children}</RoleShell>;
}
