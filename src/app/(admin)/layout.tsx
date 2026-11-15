import { AppShell } from "@/components/app/AppShell";
import { requireStaff } from "@/lib/auth/session";

// Reads the session on every request, so this route is rendered on demand.
export const instant = false;

// The admin panel is for LumenAI staff only. Everyone else gets "not found".
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const user = await requireStaff();

  return (
    <AppShell
      area="admin"
      user={{
        name: user.name,
        email: user.email,
        organisation: "LumenAI staff",
        isPlatformAdmin: true,
      }}
    >
      {children}
    </AppShell>
  );
}
