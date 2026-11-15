import { PlansClient } from "@/components/app/PlansClient";
import { requireUser } from "@/lib/auth/session";
import { loadSubscription, type Subscription } from "@/lib/subscription";
import { canManageTeam } from "@/lib/team";

// Reads the signed-in user's organisation on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Plans · LumenAI" };

const PILOT: Subscription = { plan: null, cycle: null, periodEnd: null, requested: null, locked: false };

export default async function PlansPage() {
  const user = await requireUser();
  const subscription = user.org ? await loadSubscription(user.org.id) : PILOT;

  return (
    <PlansClient
      subscription={subscription}
      canChoose={Boolean(user.org) && canManageTeam(user.org?.role)}
    />
  );
}
