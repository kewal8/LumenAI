import { apiUser, fail, handle } from "@/lib/auth/respond";
import { findPlan } from "@/lib/plans";
import { requestPlan } from "@/lib/subscription";
import { canManageTeam } from "@/lib/team";

// Online payment is not connected yet, so choosing a plan records a request
// that Radmatic activates by hand.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");
  if (!canManageTeam(user.org.role)) {
    return fail(403, "Only the owner or an admin of your organisation can choose a plan.");
  }

  const body = await request.json();
  const plan = findPlan(body.plan);
  const cycle = body.cycle === "yearly" ? "yearly" : body.cycle === "monthly" ? "monthly" : null;
  if (!plan || !cycle) return fail(400, "Choose a plan and how you want to pay.");

  await requestPlan(user.org.id, user.id, plan, cycle);
  return Response.json({ ok: true });
});
