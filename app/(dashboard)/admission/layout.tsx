import { RoleShell } from "@/components/portal/role-shell";

export default function Layout({ children }: LayoutProps<"/admission">) {
  return <RoleShell dashboard="admission">{children}</RoleShell>;
}
