import { MeList } from "@/components/app/MeList";
import { requireUser } from "@/lib/auth/session";
import { updatesLeft } from "@/lib/credits";
import { loadSubscription } from "@/lib/subscription";
import { loadCredits } from "@/lib/workspace";

// Reads the signed-in doctor's plan and today's updates on every visit.
export const instant = false;

export const metadata = { title: "Me · LumenAI" };

/**
 * The phone's "Me" tab: the doctor, their plan, and every setting as a list,
 * each opening its own screen, as in a phone's own Settings app.
 */
export default async function MePage() {
  const user = await requireUser();
  const [subscription, credits] = await Promise.all([
    user.org ? loadSubscription(user.org.id) : null,
    loadCredits(user),
  ]);
  const left = updatesLeft(credits);
  const plan = subscription?.plan ? `${subscription.plan.name} plan` : subscription?.locked ? "No plan yet" : "Free pilot";

  return (
    <MeList
      name={user.name}
      email={user.email}
      summary={left === null ? plan : `${plan} · ${left} AI updates left today`}
    />
  );
}
