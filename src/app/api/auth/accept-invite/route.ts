import { hashPassword, hashToken } from "@/lib/auth/crypto";
import { fail, handle } from "@/lib/auth/respond";
import { passwordProblem } from "@/lib/auth/rules";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const POST = handle(async (request) => {
  const body = await request.json();
  const token = typeof body.token === "string" ? body.token : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) return fail(400, "Enter your name.");
  if (name.length > 120) return fail(400, "That name is too long.");
  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);

  const sql = db();
  const [invite] = await sql`
    select id, email, org_id, org_name, role, is_platform_admin
    from invites
    where token_hash = ${hashToken(token)} and accepted_at is null and expires_at > now()
  `;
  if (!invite) return fail(400, "This invite link has expired or was already used.");

  const [taken] = await sql`select 1 from users where lower(email) = lower(${invite.email})`;
  if (taken) return fail(409, "This email already has an account. Sign in instead.");

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  // No organisation on the invite: the person gets their own.
  const orgId = invite.org_id ?? crypto.randomUUID();

  // Ids are made up front so all of this goes in as one all-or-nothing step.
  await sql.transaction([
    ...(invite.org_id
      ? []
      : [
          sql`
            insert into organizations (id, name, kind)
            values (${orgId}, ${invite.org_name ?? name}, ${invite.org_name ? "centre" : "solo"})
          `,
        ]),
    sql`
      insert into users (id, email, name, password_hash, is_platform_admin, last_login_at)
      values (${userId}, ${invite.email}, ${name}, ${passwordHash}, ${invite.is_platform_admin}, now())
    `,
    sql`
      insert into memberships (user_id, org_id, role)
      values (${userId}, ${orgId}, ${invite.role})
    `,
    sql`update invites set accepted_at = now() where id = ${invite.id}`,
  ]);

  await createSession(userId, request.headers.get("user-agent"));
  return Response.json({ ok: true });
});
