import { apiUser, handle } from "@/lib/auth/respond";
import { recordDictation } from "@/lib/usage";

// Audio goes straight from the browser to the speech service, so the browser
// reports how long it listened. One stretch is capped at an hour.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const seconds = Math.round(Number((await request.json()).seconds));
  if (seconds > 0) await recordDictation(user, Math.min(seconds, 3600));
  return Response.json({ ok: true });
});
