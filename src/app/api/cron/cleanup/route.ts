import { timingSafeEqual } from "node:crypto";
import { fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";

/** Whether the caller sent the secret Vercel adds to its scheduled calls. */
function fromScheduler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const sent = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return sent.length === expected.length && timingSafeEqual(sent, expected);
}

/**
 * Nightly tidy-up, called by Vercel's scheduler (see vercel.json). Removes
 * records that can no longer be used, so these tables stay small however long
 * the product runs: expired sessions, spent or expired password resets and
 * sign-up codes, sign-in attempts older than the lockout looks at, and the
 * error log past 30 days.
 * Needs CRON_SECRET set in the project; without it every call is refused.
 */
export const GET = handle(async (request) => {
  if (!fromScheduler(request)) return fail(401, "Not allowed.");

  const sql = db();
  const [sessions, resets, signups, attempts, errors] = await Promise.all([
    sql`delete from sessions where expires_at < now() returning 1`,
    sql`delete from password_resets where expires_at < now() - interval '1 day' returning 1`,
    sql`delete from signup_codes where expires_at < now() - interval '1 day' returning 1`,
    sql`delete from login_attempts where created_at < now() - interval '30 days' returning 1`,
    sql`delete from error_events where created_at < now() - interval '30 days' returning 1`,
  ]);
  return Response.json({
    ok: true,
    removed: {
      sessions: sessions.length,
      passwordResets: resets.length,
      signupCodes: signups.length,
      loginAttempts: attempts.length,
      errors: errors.length,
    },
  });
});
