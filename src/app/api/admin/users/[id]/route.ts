import { apiUser, fail, handle } from "@/lib/auth/respond";
import { asUuid, db } from "@/lib/db";

// Turns an account off or back on. Off means signed out everywhere and unable
// to sign in; nothing they made is deleted.
export const PATCH = handle<RouteContext<"/api/admin/users/[id]">>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only Radmatic staff can do this.");

  const { id } = await context.params;
  if (id === user.id) return fail(400, "You cannot turn off your own account.");
  const disabled = (await request.json()).disabled === true;

  const sql = db();
  const updated = await sql`
    update users set disabled_at = ${disabled ? new Date().toISOString() : null}
    where id = ${asUuid(id)}::uuid returning id
  `;
  if (updated.length === 0) return fail(404, "That account no longer exists.");
  if (disabled) await sql`delete from sessions where user_id = ${asUuid(id)}::uuid`;
  return Response.json({ ok: true });
});
