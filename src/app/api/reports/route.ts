import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { parseReportInput } from "@/lib/reportStore";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");

  const input = parseReportInput(await request.json());
  if (typeof input === "string") return fail(400, input);

  const [row] = await db()`
    insert into reports (org_id, user_id, template_name, title, template, content)
    values (${user.org.id}, ${user.id}, ${input.template.name}, ${input.report.title},
            ${JSON.stringify(input.template)}::jsonb, ${JSON.stringify(input.report)}::jsonb)
    returning id
  `;
  return Response.json({ ok: true, id: row.id });
});
