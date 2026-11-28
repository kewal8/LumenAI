import { PlansClient } from "@/components/app/PlansClient";
import { ReferralCodeEntry } from "@/components/app/Referrals";
import { requireUser } from "@/lib/auth/session";
import { loadAppliedReferral } from "@/lib/referrals";
import { loadSubscription, type Subscription } from "@/lib/subscription";
import { canManageTeam } from "@/lib/team";

// Reads the signed-in user's organisation on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Plans · Radmatic" };

const PILOT: Subscription = { plan: null, cycle: null, periodEnd: null, requested: null, locked: false };

export default async function PlansPage() {
  const user = await requireUser();
  const [subscription, applied] = user.org
    ? await Promise.all([loadSubscription(user.org.id), loadAppliedReferral(user.org.id)])
    : [PILOT, null];
  const canChoose = Boolean(user.org) && canManageTeam(user.org?.role);

  return (
    <PlansClient
      subscription={subscription}
      canChoose={canChoose}
      referral={applied && <ReferralCodeEntry applied={applied} canEdit={canChoose} />}
    />
  );
}
