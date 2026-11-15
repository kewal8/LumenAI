import { apiUser, fail, handle } from "@/lib/auth/respond";
import type { CurrentUser, Role } from "@/lib/auth/session";
import { asUuid, db } from "@/lib/db";
import { assignableRoles, canManageMember } from "@/lib/team";

type Context = RouteContext<"/api/team/members/[id]">;

async function findTarget(user: CurrentUser, id: string) {
  if (!user.org) return null;
  const [member] = await db()`
    select user_id as id, role from memberships
    where user_id = ${asUuid(id)}::uuid and org_id = ${user.org.id}
  `;
  if (!member) return null;
  const target = { id: member.id as string, role: member.role as Role };
  return canManageMember({ id: user.id, role: user.org.role }, target) ? target : null;
}

export const PATCH = handle<Context>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const target = await findTarget(user, (await context.params).id);
  if (!target || !user.org) return fail(403, "You cannot change this person.");

  const { role: requested } = await request.json();
  const role = assignableRoles(user.org.role).find((allowed) => allowed === requested);
  if (!role) return fail(403, "You cannot give that role.");

  await db()`
    update memberships set role = ${role}
    where user_id = ${target.id} and org_id = ${user.org.id}
  `;
  return Response.json({ ok: true });
});

export const DELETE = handle<Context>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const target = await findTarget(user, (await context.params).id);
  if (!target) return fail(403, "You cannot remove this person.");

  // The account is deleted outright, which also ends its sessions and frees
  // the email for a new invitation. Once reports are stored per user this
  // must become "turn off" instead, so their reports are kept.
  await db()`delete from users where id = ${target.id}`;
  return Response.json({ ok: true });
});
