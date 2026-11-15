import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";
import { parseTemplateBody } from "@/lib/templateInput";
import { asReportTemplate, findTemplate, nameTaken } from "@/lib/templateStore";

type Context = RouteContext<"/api/templates/[id]">;

// One template, ready to start a report, fetched when the doctor picks it.
export const GET = handle<Context>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const template = await findTemplate(user, (await context.params).id);
  if (!template) return fail(404, "That template no longer exists.");
  return Response.json({ template: asReportTemplate(template) });
});

export const PATCH = handle<Context>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const template = await findTemplate(user, (await context.params).id);
  if (!template?.canEdit) return fail(403, "You cannot change this template.");

  const body = await request.json();
  // From the Share dialog: who can use it, nothing else.
  if (body.sharingOnly === true) {
    if (!canManageTeam(user.org?.role)) return fail(403, "Only an owner or admin can share templates.");
    await db()`update templates set shared = ${body.shared === true}, updated_at = now() where id = ${template.id}`;
    return Response.json({ ok: true, shared: body.shared === true });
  }
  const input = parseTemplateBody(body);
  if (typeof input === "string") return fail(400, input);
  const { draft, modality, doc } = input;
  if (await nameTaken(user, draft.name, template.id)) {
    return fail(409, `You already have a template called “${draft.name}”. Choose another name.`);
  }
  // Only an owner or admin decides whether the whole organisation gets it.
  const shared = canManageTeam(user.org?.role) ? body.shared === true : template.shared;

  await db()`
    update templates
    set name = ${draft.name}, title = ${draft.title}, shared = ${shared},
        sections = ${JSON.stringify(draft.sections)}::jsonb,
        normal_impression = ${JSON.stringify(draft.normalImpression)}::jsonb,
        modality = ${modality}, doc = ${doc ? JSON.stringify(doc) : null}::jsonb,
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
