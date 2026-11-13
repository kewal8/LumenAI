import { hashPassword, hashToken } from "@/lib/auth/crypto";
import { fail, handle } from "@/lib/auth/respond";
import { passwordProblem } from "@/lib/auth/rules";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const POST = handle(async (request) => {
  const body = await request.json();
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);

  const sql = db();
  const [reset] = await sql`
    select r.id, r.user_id, u.email
    from password_resets r join users u on u.id = r.user_id
    where r.token_hash = ${hashToken(token)} and r.used_at is null
      and r.expires_at > now() and u.disabled_at is null
  `;
  if (!reset) return fail(400, "This reset link has expired or was already used.");

  const passwordHash = await hashPassword(password);
  // A new password signs out every device and clears the failed-attempt lock.
  await sql.transaction([
    sql`update users set password_hash = ${passwordHash} where id = ${reset.user_id}`,
    sql`update password_resets set used_at = now() where id = ${reset.id}`,
    sql`delete from sessions where user_id = ${reset.user_id}`,
    sql`delete from login_attempts where lower(email) = lower(${reset.email}) and not succeeded`,
  ]);

  await createSession(reset.user_id, request.headers.get("user-agent"));
  return Response.json({ ok: true });
});
