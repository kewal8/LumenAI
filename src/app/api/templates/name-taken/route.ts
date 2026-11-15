import { apiUser, handle } from "@/lib/auth/respond";
import { nameTaken } from "@/lib/templateStore";

// Whether a template name is already in use, checked while it is typed, so
// the editor does not need every template's name.
export const GET = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").slice(0, 120);
  const except = url.searchParams.get("except");
  const valid = except && /^[0-9a-f-]{36}$/i.test(except) ? except : null;
  return Response.json({ taken: name.trim() ? await nameTaken(user, name, valid) : false });
});
