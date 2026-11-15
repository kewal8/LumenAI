import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { parseReportInput } from "@/lib/reportStore";

type Context = RouteContext<"/api/reports/[id]">;

export const PATCH = handle<Context>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const body = await request.json();
  const input = parseReportInput(body);
  if (typeof input === "string") return fail(400, input);
  // Finalizing stamps the time; an ordinary save keeps the last finalized time.
  const finalize = body?.finalize === true;

  const { id } = await context.params;
  const updated = await db()`
    update reports
    set template_name = ${input.template.name}, title = ${input.report.title},
        template = ${JSON.stringify(input.template)}::jsonb,
        content = ${JSON.stringify(input.report)}::jsonb, updated_at = now(),
        finalized_at = case when ${finalize} then now() else finalized_at end
    where id::text = ${id} and user_id = ${user.id}
    returning id, finalized_at
  `;
  if (updated.length === 0) return fail(404, "That report no longer exists.");
  return Response.json({ ok: true, id, finalizedAt: updated[0].finalized_at });
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
