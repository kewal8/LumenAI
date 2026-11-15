import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { checkBody, checkShortForm } from "@/lib/macros";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const body = await request.json();
  const shortForm = checkShortForm(body.shortForm);
  if (typeof shortForm !== "string") return fail(400, shortForm.error);
  const text = checkBody(body.body);
  if (typeof text !== "string") return fail(400, text.error);

  const [row] = await db()`
    insert into macros (user_id, short_form, body) values (${user.id}, ${shortForm}, ${text})
    on conflict do nothing
    returning id
  `;
  if (!row) return fail(409, `You already have a macro called “${shortForm}”.`);
  return Response.json({ ok: true, macro: { id: row.id, shortForm, body: text } });
});
