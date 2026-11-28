import { apiUser, fail, handle } from "@/lib/auth/respond";
import { asUuid, db } from "@/lib/db";

// Turns a preview link off. It cannot be turned back on; make a new one.
export const PATCH = handle<RouteContext<"/api/admin/preview-links/[id]">>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only Radmatic staff can do this.");

  const { id } = await context.params;
  const updated = await db()`
    update preview_links set revoked_at = coalesce(revoked_at, now())
    where id = ${asUuid(id)}::uuid returning id
  `;
  if (updated.length === 0) return fail(404, "That link no longer exists.");
  return Response.json({ ok: true });
});
