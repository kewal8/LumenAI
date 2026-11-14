import { hashToken, newToken } from "@/lib/auth/crypto";
import { apiUser, fail, handle } from "@/lib/auth/respond";
import { normaliseEmail } from "@/lib/auth/rules";
import { db } from "@/lib/db";

// Creates a new account invitation: a personal account for one radiologist,
// or an organisation whose owner then invites their own team.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only LumenAI staff can do this.");

  const body = await request.json();
  const email = normaliseEmail(body.email);
  if (!email) return fail(400, "Enter a valid email address.");
  const organisation =
    body.kind === "centre" && typeof body.organisation === "string"
      ? body.organisation.trim().slice(0, 160)
      : "";
  if (body.kind === "centre" && !organisation) return fail(400, "Enter the organisation name.");

  const sql = db();
  const [taken] = await sql`select 1 from users where lower(email) = ${email}`;
  if (taken) return fail(409, "This email already has a LumenAI account.");

  const token = newToken();
  await sql.transaction([
    sql`delete from invites where lower(email) = ${email} and org_id is null and accepted_at is null`,
    sql`
      insert into invites (email, org_name, role, token_hash, invited_by, expires_at)
      values (${email}, ${organisation || null}, 'owner', ${hashToken(token)}, ${user.id},
              now() + interval '7 days')
    `,
  ]);

  return Response.json({
    ok: true,
    link: `${new URL(request.url).origin}/accept-invite?token=${token}`,
  });
});
