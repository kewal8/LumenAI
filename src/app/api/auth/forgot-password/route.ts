import { hashToken, newToken } from "@/lib/auth/crypto";
import { fail, handle } from "@/lib/auth/respond";
import { normaliseEmail } from "@/lib/auth/rules";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const POST = handle(async (request) => {
  const email = normaliseEmail((await request.json()).email);
  if (!email) return fail(400, "Enter a valid email address.");

  const sql = db();
  const [user] = await sql`
    select id, name from users where lower(email) = ${email} and disabled_at is null
  `;

  // The reply is the same whether or not the account exists, so this form
  // cannot be used to find out who has one.
  if (user) {
    const [{ recent }] = await sql`
      select count(*)::int as recent from password_resets
      where user_id = ${user.id} and created_at > now() - interval '15 minutes'
    `;
    if (recent < 3) {
      const token = newToken();
      await sql`
        insert into password_resets (user_id, token_hash, expires_at)
        values (${user.id}, ${hashToken(token)}, now() + interval '1 hour')
      `;
      const link = `${new URL(request.url).origin}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Reset your Radmatic password",
        text: `Hello ${user.name},\n\nUse this link to choose a new password. It works once and expires in one hour.\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
      });
    }
  }

  return Response.json({ ok: true });
});
