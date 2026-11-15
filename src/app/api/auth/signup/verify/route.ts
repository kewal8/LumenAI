import { fail, handle } from "@/lib/auth/respond";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { codeHash } from "@/lib/auth/signup";

/** Wrong codes allowed before a new one has to be sent. */
const MAX_ATTEMPTS = 5;

// Second step of sign-up: the emailed code proves the email is theirs. The
// account is made now, as a personal organisation with no plan yet, so the
// editor stays locked until a plan is paid for.
export const POST = handle(async (request) => {
  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (code.length !== 6) return fail(400, "Enter the 6-digit code from the email.");

  const sql = db();
  const [signup] = await sql`
    select id, email, first_name, last_name, phone, password_hash, code_hash, attempts,
           expires_at < now() as expired
    from signup_codes where id::text = ${id} and used_at is null
  `;
  if (!signup || signup.expired) return fail(400, "This code has expired. Send a new one.");
  if (signup.attempts >= MAX_ATTEMPTS) return fail(429, "Too many wrong codes. Send a new one.");

  if (codeHash(signup.id, code) !== signup.code_hash) {
    await sql`update signup_codes set attempts = attempts + 1 where id = ${signup.id}`;
    const left = MAX_ATTEMPTS - signup.attempts - 1;
    return fail(
      400,
      left > 0
        ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "Too many wrong codes. Send a new one.",
    );
  }

  const [taken] = await sql`select 1 from users where lower(email) = lower(${signup.email})`;
  if (taken) return fail(409, "This email already has an account. Sign in instead.");

  const name = `${signup.first_name} ${signup.last_name}`;
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  // Ids are made up front so all of this goes in as one all-or-nothing step.
  await sql.transaction([
    sql`insert into organizations (id, name, kind) values (${orgId}, ${name}, 'solo')`,
    sql`
      insert into users (id, email, name, phone, password_hash, last_login_at)
      values (${userId}, ${signup.email}, ${name}, ${signup.phone}, ${signup.password_hash}, now())
    `,
    sql`insert into memberships (user_id, org_id, role) values (${userId}, ${orgId}, 'owner')`,
    sql`insert into subscriptions (org_id, status) values (${orgId}, 'unpaid')`,
    sql`update signup_codes set used_at = now() where id = ${signup.id}`,
  ]);

  await createSession(userId, request.headers.get("user-agent"));
  return Response.json({ ok: true, home: "/welcome" });
});
