import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { parseReportInput } from "@/lib/reportStore";

type Context = RouteContext<"/api/reports/[id]">;

export const PATCH = handle<Context>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const input = parseReportInput(await request.json());
  if (typeof input === "string") return fail(400, input);

  const { id } = await context.params;
  const updated = await db()`
    update reports
    set template_name = ${input.template.name}, title = ${input.report.title},
        template = ${JSON.stringify(input.template)}::jsonb,
        content = ${JSON.stringify(input.report)}::jsonb, updated_at = now()
    where id::text = ${id} and user_id = ${user.id}
    returning id
  `;
  if (updated.length === 0) return fail(404, "That report no longer exists.");
  return Response.json({ ok: true, id });
});

export const DELETE = handle<Context>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await context.params;
  const removed = await db()`
    delete from reports where id::text = ${id} and user_id = ${user.id} returning id
  `;
  if (removed.length === 0) return fail(404, "That report no longer exists.");
  return Response.json({ ok: true });
});
