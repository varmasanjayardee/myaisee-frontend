import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/mentor">) {
  return <RoleShell dashboard="mentor">{children}</RoleShell>;
}
