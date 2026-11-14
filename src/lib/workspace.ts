import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import { toTemplate } from "@/lib/templateInput";
import { listTemplates } from "@/lib/templateStore";
import { CT_BRAIN_PLAIN } from "@/lib/templates";

/** What the report workspace needs: paste format and usable templates, `first` leading. */
export async function loadWorkspace(user: CurrentUser, first: string | null = null) {
  const [[row], stored] = await Promise.all([
    db()`select paste_profile from users where id = ${user.id}`,
    listTemplates(user),
  ]);

  // Until someone adds their own, the built-in sample keeps the screen usable.
  const templates =
    stored.length > 0 ? stored.map((template) => toTemplate(template.id, template)) : [CT_BRAIN_PLAIN];
  const index = templates.findIndex((template) => template.id === first);
  if (index > 0) templates.unshift(...templates.splice(index, 1));

  return { profile: parsePasteProfile(row?.paste_profile), templates };
}
