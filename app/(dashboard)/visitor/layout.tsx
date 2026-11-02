import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/visitor">) {
  return <RoleShell dashboard="visitor">{children}</RoleShell>;
}
