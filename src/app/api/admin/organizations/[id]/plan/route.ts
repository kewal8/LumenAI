import { apiUser, fail, handle } from "@/lib/auth/respond";
import { asUuid, db } from "@/lib/db";
import { findPlan } from "@/lib/plans";
import { activatePlan, endPlan } from "@/lib/subscription";

// Starts or ends an organisation's paid plan by hand. Used after payment has
// been taken, until online payment is connected.
export const PATCH = handle<RouteContext<"/api/admin/organizations/[id]/plan">>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only Radmatic staff can do this.");

  const { id } = await context.params;
  const [org] = await db()`select id from organizations where id = ${asUuid(id)}::uuid`;
  if (!org) return fail(404, "That account no longer exists.");

  const body = await request.json();
  if (body.action === "end") {
    await endPlan(org.id);
    return Response.json({ ok: true });
  }

  const plan = findPlan(body.plan);
  const cycle = body.cycle === "yearly" ? "yearly" : body.cycle === "monthly" ? "monthly" : null;
  if (!plan || !cycle) return fail(400, "Choose a plan and a billing cycle.");
  // The first activation of a referred account pays its referrer.
  const referralReward = await activatePlan(org.id, plan, cycle);
  return Response.json({ ok: true, referralReward });
});
