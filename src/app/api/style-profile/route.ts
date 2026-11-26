import { apiUser, fail, handle } from "@/lib/auth/respond";
import {
  PROFILE_MAX,
  REPORTS_PER_BUILD,
  getStyleProfile,
  rebuildStyleProfile,
  resetStyleProfile,
  saveStyleProfile,
} from "@/lib/styleProfile";

// The doctor's own reporting-style profile, from Settings: edit it, learn it
// again from their finalized reports now, or start over.

export const PATCH = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const body = await request.json().catch(() => ({}));
  if (typeof body?.profile !== "string") return fail(400, "Write the profile first.");
  const profile = body.profile.trim();
  if (profile.length > PROFILE_MAX) return fail(400, `Keep it under ${PROFILE_MAX.toLocaleString("en-IN")} characters.`);
  await saveStyleProfile(user.id, profile);
  return Response.json({ ok: true, profile: await getStyleProfile(user.id) });
});

export const POST = handle(async () => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const current = await getStyleProfile(user.id);
  if (current.finalized < REPORTS_PER_BUILD) {
    return fail(400, `Finalize ${REPORTS_PER_BUILD - current.finalized} more report${REPORTS_PER_BUILD - current.finalized === 1 ? "" : "s"} first, so there is enough of your wording to learn from.`);
  }
  const changed = await rebuildStyleProfile(user, { force: true });
  const profile = await getStyleProfile(user.id);
  if (!changed && !profile.builtAt) return fail(502, "Your style could not be learned just now. Try again in a moment.");
  return Response.json({ ok: true, changed, profile });
});

export const DELETE = handle(async () => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  await resetStyleProfile(user.id);
  return Response.json({ ok: true, profile: await getStyleProfile(user.id) });
});
