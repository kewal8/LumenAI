import { apiUser, fail, handle } from "@/lib/auth/respond";
import { asUuid, db } from "@/lib/db";
import { DEMO_STATUSES } from "@/lib/demo";

export const PATCH = handle<RouteContext<"/api/demo-requests/[id]">>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only Radmatic staff can do this.");

  const { status: requested } = await request.json();
  const status = DEMO_STATUSES.find((allowed) => allowed === requested);
  if (!status) return fail(400, "Unknown status.");

  const { id } = await context.params;
  const updated = await db()`
    update demo_requests set status = ${status} where id = ${asUuid(id)}::uuid returning id
  `;
  if (updated.length === 0) return fail(404, "That request no longer exists.");
  return Response.json({ ok: true });
});
