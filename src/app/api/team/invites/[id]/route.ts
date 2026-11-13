import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";

export const DELETE = handle<RouteContext<"/api/team/invites/[id]">>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org || !canManageTeam(user.org.role)) return fail(403, "You cannot manage invitations.");

  const { id } = await context.params;
  const removed = await db()`
    delete from invites
    where id::text = ${id} and org_id = ${user.org.id} and accepted_at is null
    returning id
  `;
  if (removed.length === 0) return fail(404, "That invitation no longer exists.");
  return Response.json({ ok: true });
});
