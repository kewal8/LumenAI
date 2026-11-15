import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { checkBody, checkShortForm } from "@/lib/macros";

// Changes a macro's short form or full text.
export const PATCH = handle<RouteContext<"/api/macros/[id]">>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const { id } = await context.params;
  const body = await request.json();
  const shortForm = checkShortForm(body.shortForm);
  if (typeof shortForm !== "string") return fail(400, shortForm.error);
  const text = checkBody(body.body);
  if (typeof text !== "string") return fail(400, text.error);

  const sql = db();
  const [clash] = await sql`
    select 1 from macros
    where user_id = ${user.id} and lower(short_form) = lower(${shortForm}) and id::text <> ${id}
  `;
  if (clash) return fail(409, `You already have a macro called “${shortForm}”.`);

  const updated = await sql`
    update macros set short_form = ${shortForm}, body = ${text}
    where id::text = ${id} and user_id = ${user.id} returning id
  `;
  if (updated.length === 0) return fail(404, "That macro no longer exists.");
  return Response.json({ ok: true, macro: { id, shortForm, body: text } });
});

export const DELETE = handle<RouteContext<"/api/macros/[id]">>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const { id } = await context.params;
  const deleted = await db()`
    delete from macros where id::text = ${id} and user_id = ${user.id} returning id
  `;
  if (deleted.length === 0) return fail(404, "That macro no longer exists.");
  return Response.json({ ok: true });
});
