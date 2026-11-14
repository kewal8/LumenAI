import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";
import { parseTemplateDraft } from "@/lib/templateInput";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");

  const body = await request.json();
  const draft = parseTemplateDraft(body);
  if (typeof draft === "string") return fail(400, draft);
  const shared = body.shared === true && canManageTeam(user.org.role);

  const [row] = await db()`
    insert into templates (org_id, owner_id, shared, name, title, sections, normal_impression)
    values (${user.org.id}, ${user.id}, ${shared}, ${draft.name}, ${draft.title},
            ${JSON.stringify(draft.sections)}::jsonb, ${JSON.stringify(draft.normalImpression)}::jsonb)
    returning id
  `;
  return Response.json({ ok: true, id: row.id });
});
