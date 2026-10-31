import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/admin">) {
  return <RoleShell dashboard="admin">{children}</RoleShell>;
}
