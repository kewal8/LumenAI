import { hashToken, newToken } from "@/lib/auth/crypto";
import { apiUser, fail, handle } from "@/lib/auth/respond";
import { normaliseEmail } from "@/lib/auth/rules";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ROLE_LABELS, assignableRoles } from "@/lib/team";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");

  const body = await request.json();
  const email = normaliseEmail(body.email);
  const role = assignableRoles(user.org.role).find((allowed) => allowed === body.role);
  if (!email) return fail(400, "Enter a valid email address.");
  if (!role) return fail(403, "You cannot invite someone with that role.");

  const sql = db();
  const [taken] = await sql`select 1 from users where lower(email) = ${email}`;
  if (taken) return fail(409, "This email already has a Radmatic account.");

  const token = newToken();
  // A new invite for the same person replaces any earlier unused one.
  await sql.transaction([
    sql`
      delete from invites
      where lower(email) = ${email} and org_id = ${user.org.id} and accepted_at is null
    `,
    sql`
      insert into invites (email, org_id, role, token_hash, invited_by, expires_at)
      values (${email}, ${user.org.id}, ${role}, ${hashToken(token)}, ${user.id}, now() + interval '7 days')
    `,
  ]);

  const link = `${new URL(request.url).origin}/accept-invite?token=${token}`;
  await sendEmail({
    to: email,
    subject: `${user.name} invited you to ${user.org.name} on Radmatic`,
    text: `${user.name} has invited you to join ${user.org.name} on Radmatic as ${ROLE_LABELS[role].toLowerCase()}.\n\nSet up your account with this link. It works once and expires in 7 days.\n\n${link}`,
  });

  // The link is returned once so it can be passed on by hand; only its hash is kept.
  return Response.json({ ok: true, link });
});
