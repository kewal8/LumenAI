import { hashToken, newToken } from "@/lib/auth/crypto";
import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { PREVIEW_DAYS } from "@/lib/previewLinks";

// Creates a link to the editor preview for one named person. The link is
// returned once; only its hash is kept.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.isPlatformAdmin) return fail(403, "Only Radmatic staff can do this.");

  const body = await request.json();
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "";
  if (!label) return fail(400, "Enter who the link is for.");
  const days = PREVIEW_DAYS.includes(body.days) ? (body.days as number) : PREVIEW_DAYS[0];

  const token = newToken();
  await db()`
    insert into preview_links (label, token_hash, created_by, expires_at)
    values (${label}, ${hashToken(token)}, ${user.id}, now() + make_interval(days => ${days}))
  `;

  return Response.json({
    ok: true,
    link: `${new URL(request.url).origin}/preview/editor/${token}`,
  });
});
