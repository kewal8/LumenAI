import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";
import { parseTemplateDraft } from "@/lib/templateInput";
import { findTemplate } from "@/lib/templateStore";

type Context = RouteContext<"/api/templates/[id]">;

export const PATCH = handle<Context>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const template = await findTemplate(user, (await context.params).id);
  if (!template?.canEdit) return fail(403, "You cannot change this template.");

  const body = await request.json();
  const draft = parseTemplateDraft(body);
  if (typeof draft === "string") return fail(400, draft);
  // Only an owner or admin decides whether the whole organisation gets it.
  const shared = canManageTeam(user.org?.role) ? body.shared === true : template.shared;

  await db()`
    update templates
    set name = ${draft.name}, title = ${draft.title}, shared = ${shared},
        sections = ${JSON.stringify(draft.sections)}::jsonb,
        normal_impression = ${JSON.stringify(draft.normalImpression)}::jsonb,
        updated_at = now()
    where id = ${template.id}
  `;
  return Response.json({ ok: true, id: template.id });
});

export const DELETE = handle<Context>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const template = await findTemplate(user, (await context.params).id);
  if (!template?.canEdit) return fail(403, "You cannot delete this template.");

  await db()`delete from templates where id = ${template.id}`;
  return Response.json({ ok: true });
});
