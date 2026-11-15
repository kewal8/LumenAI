import { AppShell } from "@/components/app/AppShell";
import { requireUser } from "@/lib/auth/session";
import { editorLocked } from "@/lib/subscription";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

// Everything in this group needs a signed-in user.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const locked = await editorLocked(user);

  return (
    <AppShell
      area="doctor"
      user={{
        name: user.name,
        email: user.email,
        organisation: user.org?.name ?? null,
        isPlatformAdmin: user.isPlatformAdmin,
        locked,
      }}
    >
      {children}
    </AppShell>
  );
}
