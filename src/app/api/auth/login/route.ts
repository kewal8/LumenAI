import { burnPasswordCheck, verifyPassword } from "@/lib/auth/crypto";
import { clientIp, fail, handle } from "@/lib/auth/respond";
import { normaliseEmail } from "@/lib/auth/rules";
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

  // Five wrong passwords for one email in 15 minutes pauses sign-in for it.
  const [{ failures }] = await sql`
    select count(*)::int as failures from login_attempts
    where lower(email) = ${email} and not succeeded
      and created_at > now() - interval '15 minutes'
  `;
  if (failures >= MAX_FAILURES) {
    return fail(429, "Too many attempts. Wait 15 minutes, or reset your password.");
  }

  const [user] = await sql`
    select id, password_hash, disabled_at from users where lower(email) = ${email}
  `;

  let ok = false;
  if (user) ok = await verifyPassword(password, user.password_hash);
  else await burnPasswordCheck(password);

  await sql`
    insert into login_attempts (email, ip, succeeded) values (${email}, ${ip}, ${ok})
  `;
  if (!ok) return fail(401, WRONG);
  if (user.disabled_at) return fail(403, "This account has been turned off. Contact your administrator.");

  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await createSession(user.id, request.headers.get("user-agent"));
  return Response.json({ ok: true });
});
