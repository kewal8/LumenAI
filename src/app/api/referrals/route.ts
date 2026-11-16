import { apiUser, fail, handle } from "@/lib/auth/respond";
import { findReferrer, loadAppliedReferral, normaliseCode, recordReferral, referralProblem } from "@/lib/referrals";
import { canManageTeam } from "@/lib/team";

// A referral code typed on the Plans page, before the account's first payment.
// Typing another code replaces the first; after payment it can no longer change.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");
  if (!canManageTeam(user.org.role)) {
    return fail(403, "Only the owner or an admin of your organisation can add a referral code.");
  }

  const body = await request.json();
  const code = normaliseCode(body.code);
  if (!code) return fail(400, "Enter a referral code.");

  const applied = await loadAppliedReferral(user.org.id);
  if (!applied.canChange) return fail(409, "A referral code can only be added before your first payment.");

  const referrer = await findReferrer(code);
  if (!referrer) return fail(404, "That referral code is not right. Check it and try again.");
  const problem = referralProblem(referrer, { orgId: user.org.id, email: user.email });
  if (problem) return fail(400, problem);

  await recordReferral({ referrer, referredOrgId: user.org.id, referredUserId: user.id, source: "plans" });
  return Response.json({ ok: true, code: referrer.code, referrerName: referrer.name });
});
