import { randomInt } from "node:crypto";
import { hashPassword } from "@/lib/auth/crypto";
import { fail, handle } from "@/lib/auth/respond";
import { normaliseEmail, normalisePhone, passwordProblem } from "@/lib/auth/rules";
import { codeHash } from "@/lib/auth/signup";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { findReferrer, normaliseCode, referralProblem } from "@/lib/referrals";

const CODE_MINUTES = 10;
/** Codes one email can ask for in an hour, so the form cannot be used to flood an inbox. */
const CODES_PER_HOUR = 5;

function namePart(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

// First step of sign-up: checks the details and emails a six-digit code.
// Nothing is created until the code comes back (see ./verify).
export const POST = handle(async (request) => {
  const body = await request.json();
  const firstName = namePart(body.firstName);
  const lastName = namePart(body.lastName);
  const email = normaliseEmail(body.email);
  const phone = normalisePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";

  if (!firstName || !lastName) return fail(400, "Enter your first and last name.");
  if (firstName.length > 60 || lastName.length > 60) return fail(400, "That name is too long.");
  if (!email) return fail(400, "Enter a valid email address.");
  const problem = passwordProblem(password);
  if (problem) return fail(400, `Password: ${problem}`);
  if (!phone) return fail(400, "Enter a 10-digit mobile number.");

  // A referral code is optional, but one that is typed must be real.
  const referralCode = normaliseCode(body.referralCode);
  if (referralCode) {
    const referrer = await findReferrer(referralCode);
    if (!referrer) return fail(400, "That referral code is not right. Check it, or leave it empty.");
    const problem = referralProblem(referrer, { orgId: null, email });
    if (problem) return fail(400, problem);
  }

  const sql = db();
  const [taken] = await sql`select 1 from users where lower(email) = ${email}`;
  if (taken) return fail(409, "This email already has an account. Sign in instead.");

  const [{ recent }] = await sql`
    select count(*)::int as recent from signup_codes
    where lower(email) = ${email} and created_at > now() - interval '1 hour'
  `;
  if (recent >= CODES_PER_HOUR) {
    return fail(429, "Too many codes sent to this email. Wait an hour, then try again.");
  }

  const id = crypto.randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // A new code replaces any earlier one for this email.
  await sql.transaction([
    sql`update signup_codes set used_at = now() where lower(email) = ${email} and used_at is null`,
    sql`
      insert into signup_codes (id, email, first_name, last_name, phone, password_hash, code_hash, expires_at, referral_code)
      values (${id}, ${email}, ${firstName}, ${lastName}, ${phone}, ${await hashPassword(password)},
              ${codeHash(id, code)}, now() + ${`${CODE_MINUTES} minutes`}::interval, ${referralCode || null})
    `,
  ]);

  await sendEmail({
    to: email,
    subject: `${code} is your LumenAI code`,
    text: `Hello ${firstName},\n\nYour LumenAI sign-up code is ${code}\n\nIt works for ${CODE_MINUTES} minutes. If you did not ask for it, ignore this email.\n\nLumenAI`,
  });

  // On a developer's machine with no email service, the code is handed back so
  // sign-up can be tried. Never in production.
  const showCode = process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY;
  return Response.json({ ok: true, id, ...(showCode ? { devCode: code } : {}) });
});
