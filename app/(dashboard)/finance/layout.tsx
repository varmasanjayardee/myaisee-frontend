import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/finance">) {
  return <RoleShell dashboard="finance">{children}</RoleShell>;
}
