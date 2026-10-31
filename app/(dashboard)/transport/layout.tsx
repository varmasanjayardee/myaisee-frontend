import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/transport">) {
  return <RoleShell dashboard="transport">{children}</RoleShell>;
}
