import { apiUser, fail, handle } from "@/lib/auth/respond";
import { asUuid, db } from "@/lib/db";

// Deletes one feedback message from the admin inbox. Staff only.
export const DELETE = handle<RouteContext<"/api/admin/feedback/[id]">>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only Radmatic staff can do this.");

  const { id } = await context.params;
  const removed = await db()`delete from feedback where id = ${asUuid(id)}::uuid returning id`;
  if (removed.length === 0) return fail(404, "That feedback no longer exists.");
  return Response.json({ ok: true });
});
