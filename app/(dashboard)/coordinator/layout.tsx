import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/coordinator">) {
  return <RoleShell dashboard="coordinator">{children}</RoleShell>;
}
