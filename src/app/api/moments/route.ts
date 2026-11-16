import { apiUser, fail, handle } from "@/lib/auth/respond";
import { MOMENT_NAME, markMoment } from "@/lib/moments";

// Marks a greeting or reminder as seen, or puts it off: { moment, snoozeHours? }.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const body = await request.json();
  const moment = typeof body.moment === "string" ? body.moment : "";
  if (!MOMENT_NAME.test(moment)) return fail(400, "Unknown moment.");
  const hours = Number(body.snoozeHours);
  const snoozeHours = Number.isInteger(hours) && hours > 0 && hours <= 72 ? hours : null;

  await markMoment(user.id, moment, snoozeHours);
  return Response.json({ ok: true });
});
