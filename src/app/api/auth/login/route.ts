import { burnPasswordCheck, verifyPassword } from "@/lib/auth/crypto";
import { clientIp, fail, handle } from "@/lib/auth/respond";
import { homePath, normaliseEmail } from "@/lib/auth/rules";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

const MAX_FAILURES = 5;
const WRONG = "Wrong email or password.";

export const POST = handle(async (request) => {
  const body = await request.json();
  const email = normaliseEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return fail(400, "Enter your email and password.");

  const sql = db();
  const ip = clientIp(request);

  // Both read together: one wait on the database, not two.
  // Five wrong passwords for one email in 15 minutes pauses sign-in for it.
  const [[{ failures }], [user]] = await Promise.all([
    sql`
      select count(*)::int as failures from login_attempts
      where lower(email) = ${email} and not succeeded
        and created_at > now() - interval '15 minutes'
    `,
    sql`
      select id, password_hash, disabled_at, is_platform_admin from users where lower(email) = ${email}
    `,
  ]);
  if (failures >= MAX_FAILURES) {
    return fail(429, "Too many attempts. Wait 15 minutes, or reset your password.");
  }

  let ok = false;
  if (user) ok = await verifyPassword(password, user.password_hash);
  else await burnPasswordCheck(password);

  const logged = sql`
    insert into login_attempts (email, ip, succeeded) values (${email}, ${ip}, ${ok})
  `;
  if (!ok) {
    await logged;
    return fail(401, WRONG);
  }
  if (user.disabled_at) {
    await logged;
    return fail(403, "This account has been turned off. Contact your administrator.");
  }

  // The attempt, the last sign-in time and the new session are written together.
  await Promise.all([
    logged,
    sql`update users set last_login_at = now() where id = ${user.id}`,
    createSession(user.id, request.headers.get("user-agent")),
  ]);
  return Response.json({ ok: true, home: homePath(user.is_platform_admin) });
});
