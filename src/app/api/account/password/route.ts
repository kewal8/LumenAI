import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { apiUser, fail, handle } from "@/lib/auth/respond";
import { passwordProblem } from "@/lib/auth/rules";
import { currentSessionHash } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const body = await request.json();
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  const sql = db();
  const [row] = await sql`select password_hash from users where id = ${user.id}`;
  if (!(await verifyPassword(current, row.password_hash))) {
    return fail(400, "Your current password is not correct.");
  }
  const problem = passwordProblem(next);
  if (problem) return fail(400, problem);
  if (next === current) return fail(400, "Choose a password different from the current one.");

  const passwordHash = await hashPassword(next);
  const keep = await currentSessionHash();
  // Every other device is signed out; this one stays in.
  await sql.transaction([
    sql`update users set password_hash = ${passwordHash} where id = ${user.id}`,
    sql`delete from sessions where user_id = ${user.id} and token_hash <> ${keep ?? ""}`,
  ]);
  return Response.json({ ok: true });
});
