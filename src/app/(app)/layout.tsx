import { AppShell } from "@/components/app/AppShell";
import { requireUser } from "@/lib/auth/session";
import { editorLocked } from "@/lib/subscription";
import { updatesLeft } from "@/lib/credits";
import { loadCredits } from "@/lib/workspace";
import { greetingName } from "@/lib/greeting";
import { renewalDue } from "@/lib/moments";
import { RenewalPromptLazy } from "@/components/welcome/RenewalPromptLazy";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

// Everything in this group needs a signed-in user.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [locked, credits, renewal] = await Promise.all([editorLocked(user), loadCredits(user), renewalDue(user)]);

  return (
    <AppShell
      area="doctor"
      user={{
        name: user.name,
        email: user.email,
        organisation: user.org?.name ?? null,
        isPlatformAdmin: user.isPlatformAdmin,
        locked,
        updatesLeft: updatesLeft(credits),
      }}
    >
      {children}
      {/* Asks the owner to renew in the last week of a plan. */}
      {renewal && <RenewalPromptLazy key={renewal.moment} due={renewal} firstName={greetingName(user.name)} />}
    </AppShell>
  );
}
