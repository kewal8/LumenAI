import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import { listMacros } from "@/lib/macroStore";
import { loadSubscription } from "@/lib/subscription";
import { getIdentity } from "@/lib/reportIdentity";
import { parseShortcuts } from "@/lib/shortcuts";
import type { DocNode } from "@/lib/reportDoc";
import { readTemplate } from "@/lib/templateDoc";
import { toTemplate } from "@/lib/templateInput";
import { listTemplates } from "@/lib/templateStore";
import { CT_BRAIN_PLAIN } from "@/lib/templates";

/** What the report workspace needs: paste format, sign-off and usable templates, `first` leading. */
export async function loadWorkspace(user: CurrentUser, first: string | null = null) {
  const [[row], stored, identity, macros, credits] = await Promise.all([
    db()`select paste_profile, shortcuts, floating_box from users where id = ${user.id}`,
    listTemplates(user),
    getIdentity(user.id),
    listMacros(user.id),
    loadCredits(user),
  ]);

  // Until someone adds their own, the built-in sample keeps the screen usable.
  const templates =
    stored.length > 0
      ? stored.map((template) => {
          // Written in the template editor: reports start from that page, as written.
          const read = template.doc ? readTemplate(template.doc as DocNode, template.name) : null;
          return typeof read === "object" && read
            ? { ...toTemplate(template.id, read.draft), doc: read.reportDoc }
            : toTemplate(template.id, template);
        })
      : [CT_BRAIN_PLAIN];
  const index = templates.findIndex((template) => template.id === first);
  if (index > 0) templates.unshift(...templates.splice(index, 1));

  return {
    profile: parsePasteProfile(row?.paste_profile),
    shortcuts: parseShortcuts(row?.shortcuts),
    floatingBox: row?.floating_box !== false,
    templates,
    identity,
    macros,
    credits,
  };
}

/** AI updates the account may still make today; `limit` is null on the pilot, which has none. */
export type Credits = { limit: number | null; used: number };

async function loadCredits(user: CurrentUser): Promise<Credits> {
  if (!user.org) return { limit: null, used: 0 };
  const [subscription, [row]] = await Promise.all([
    loadSubscription(user.org.id),
    // A day runs midnight to midnight in India, where the doctors are.
    db()`
      select count(*)::int as used from usage_events
      where org_id = ${user.org.id} and purpose = 'report'
        and created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')
    `,
  ]);
  return { limit: subscription.plan?.creditsPerDay ?? null, used: row?.used ?? 0 };
}
