import { cache } from "react";
import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import { listMacros } from "@/lib/macroStore";
import { loadSubscription } from "@/lib/subscription";
import { getIdentitySummary } from "@/lib/reportIdentity";
import { parseShortcuts } from "@/lib/shortcuts";
import { loadReportTemplate } from "@/lib/templateStore";
import { CT_BRAIN_PLAIN } from "@/lib/templates";

/**
 * What the report workspace needs: paste format, sign-off and the one template
 * the report starts from (`first`, or the most recently changed). Other
 * templates are fetched only when the doctor picks one.
 */
export async function loadWorkspace(user: CurrentUser, first: string | null = null) {
  const [[row], stored, identity, macros, credits] = await Promise.all([
    db()`select paste_profile, shortcuts, floating_box from users where id = ${user.id}`,
    loadReportTemplate(user, first),
    getIdentitySummary(user.id),
    listMacros(user.id),
    loadCredits(user),
  ]);

  // Until someone adds their own, the built-in sample keeps the screen usable.
  const template = stored ?? CT_BRAIN_PLAIN;

  return {
    profile: parsePasteProfile(row?.paste_profile),
    shortcuts: parseShortcuts(row?.shortcuts),
    floatingBox: row?.floating_box !== false,
    template,
    identity,
    macros,
    credits,
  };
}

/** AI updates the account may still make today; `limit` is null on the pilot, which has none. */
export type Credits = { limit: number | null; used: number };

// Read once per request: the app menu and the report screen both show it.
export const loadCredits = cache(async (user: CurrentUser): Promise<Credits> => {
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
});

/** AI updates one person may make in a minute; far above real dictation, so only a runaway is stopped. */
const UPDATES_PER_MINUTE = 20;

/**
 * Why this person may not make another AI update right now, or null when they
 * may. The plan's daily number is enforced here, on the server, not only shown.
 */
export async function updateRefusal(user: CurrentUser): Promise<string | null> {
  const [credits, [row]] = await Promise.all([
    loadCredits(user),
    db()`
      select count(*)::int as recent from usage_events
      where user_id = ${user.id} and purpose = 'report' and created_at > now() - interval '1 minute'
    `,
  ]);
  if ((row?.recent ?? 0) >= UPDATES_PER_MINUTE) {
    return "Too many updates in one minute. Wait a moment and try again.";
  }
  if (credits.limit !== null && credits.used >= credits.limit) {
    return `Today's ${credits.limit} AI updates are used. They start again at midnight, or choose a bigger plan on the Plans page.`;
  }
  return null;
}
