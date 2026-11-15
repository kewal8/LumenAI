import { apiUser, handle } from "@/lib/auth/respond";
import { getIdentityImages } from "@/lib/reportIdentity";

/**
 * The doctor's signature and letterhead images. The address carries a version
 * that changes when they do, so the browser may keep the answer for good and
 * a report page never has to carry them.
 */
export const GET = handle(async () => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json(await getIdentityImages(user.id), {
    headers: { "Cache-Control": "private, max-age=31536000, immutable" },
  });
});
