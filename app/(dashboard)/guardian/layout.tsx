import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/guardian">) {
  return <RoleShell dashboard="guardian">{children}</RoleShell>;
}
