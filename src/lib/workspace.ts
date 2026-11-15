import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import { getIdentity } from "@/lib/reportIdentity";
import { parseShortcuts } from "@/lib/shortcuts";
import { toTemplate } from "@/lib/templateInput";
import { listTemplates } from "@/lib/templateStore";
import { CT_BRAIN_PLAIN } from "@/lib/templates";

/** What the report workspace needs: paste format, sign-off and usable templates, `first` leading. */
export async function loadWorkspace(user: CurrentUser, first: string | null = null) {
  const [[row], stored, identity] = await Promise.all([
    db()`select paste_profile, shortcuts from users where id = ${user.id}`,
    listTemplates(user),
    getIdentity(user.id),
  ]);

  // Until someone adds their own, the built-in sample keeps the screen usable.
  const templates =
    stored.length > 0 ? stored.map((template) => toTemplate(template.id, template)) : [CT_BRAIN_PLAIN];
  const index = templates.findIndex((template) => template.id === first);
  if (index > 0) templates.unshift(...templates.splice(index, 1));

  return {
    profile: parsePasteProfile(row?.paste_profile),
    shortcuts: parseShortcuts(row?.shortcuts),
    templates,
    identity,
  };
}
