import { apiUser, handle } from "@/lib/auth/respond";
import { searchTemplateOptions } from "@/lib/templateStore";

// Template names for the picker on the report screen: the first few, or those
// matching what is typed. Never the whole list.
export const GET = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  return Response.json({ options: await searchTemplateOptions(user, q, 20) });
});
