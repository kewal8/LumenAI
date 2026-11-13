import { clientIp, fail, handle } from "@/lib/auth/respond";
import { normaliseEmail } from "@/lib/auth/rules";
import { db } from "@/lib/db";
import { ORGANISATION_TYPES } from "@/lib/demo";
import { sendEmail } from "@/lib/email";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const POST = handle(async (request) => {
  const body = await request.json();

  // Hidden field that people never see. Anything in it means a bot filled the
  // form, so it is told "thanks" and nothing is stored.
  if (text(body.website, 200)) return Response.json({ ok: true });

  const name = text(body.name, 120);
  const email = normaliseEmail(body.email);
  const phone = text(body.phone, 30);
  const digits = phone.replace(/\D/g, "");

  if (!name) return fail(400, "Enter your name.");
  if (!email) return fail(400, "Enter a valid email address.");
  if (digits.length < 7 || digits.length > 15 || !/^[+\d\s()-]+$/.test(phone)) {
    return fail(400, "Enter a phone number we can reach you on, with country code.");
  }

  const organisationType = ORGANISATION_TYPES.find((type) => type === body.organisationType) ?? null;
  const designation = text(body.designation, 120) || null;
  const organisation = text(body.organisation, 160) || null;
  const location = text(body.location, 120) || null;
  const message = text(body.message, 2000) || null;

  const sql = db();
  const ip = clientIp(request);

  // At most five requests an hour from one address.
  if (ip) {
    const [{ recent }] = await sql`
      select count(*)::int as recent from demo_requests
      where ip = ${ip} and created_at > now() - interval '1 hour'
    `;
    if (recent >= 5) {
      return fail(429, "We already have several requests from you. We will be in touch.");
    }
  }

  await sql`
    insert into demo_requests
      (name, email, phone, designation, organisation, organisation_type, location, message, ip, user_agent)
    values
      (${name}, ${email}, ${phone}, ${designation}, ${organisation}, ${organisationType},
       ${location}, ${message}, ${ip}, ${request.headers.get("user-agent")})
  `;

  const notify = process.env.DEMO_NOTIFY_EMAIL;
  if (notify) {
    await sendEmail({
      to: notify,
      subject: `Demo request: ${name}${organisation ? `, ${organisation}` : ""}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Designation: ${designation ?? "-"}`,
        `Organisation: ${organisation ?? "-"}`,
        `Type: ${organisationType ?? "-"}`,
        `Location: ${location ?? "-"}`,
        "",
        message ?? "(no message)",
      ].join("\n"),
    });
  }

  return Response.json({ ok: true });
});
