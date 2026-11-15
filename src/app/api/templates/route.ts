import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";
import { parseTemplateBody } from "@/lib/templateInput";
import { nameTaken } from "@/lib/templateStore";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");

  const body = await request.json();
  const input = parseTemplateBody(body);
  if (typeof input === "string") return fail(400, input);
  const { draft, modality, doc } = input;
  if (await nameTaken(user, draft.name)) {
    return fail(409, `You already have a template called “${draft.name}”. Choose another name.`);
  }
  const shared = body.shared === true && canManageTeam(user.org.role);

  const [row] = await db()`
    insert into templates (org_id, owner_id, shared, name, title, sections, normal_impression, modality, doc)
    values (${user.org.id}, ${user.id}, ${shared}, ${draft.name}, ${draft.title},
            ${JSON.stringify(draft.sections)}::jsonb, ${JSON.stringify(draft.normalImpression)}::jsonb,
            ${modality}, ${doc ? JSON.stringify(doc) : null}::jsonb)
    returning id
  `;
  return Response.json({ ok: true, id: row.id });
});
