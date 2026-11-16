import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { loadCredits, type Credits } from "@/lib/workspace";

/** One day of AI updates: this person's and the rest of their team's. */
export type UsageDay = { day: string; mine: number; others: number };

export type UsageActivity = {
  credits: Credits;
  /** The last 30 days, oldest first, today last. */
  days: UsageDay[];
  /** Seconds this person dictated since the 1st of this month. */
  dictationSeconds: number;
};

/**
 * How the account's AI updates have been spent: today against the plan's
 * daily number, and each of the last 30 days. Days are Indian days, as the
 * daily allowance is.
 */
export async function loadUsageActivity(user: CurrentUser): Promise<UsageActivity> {
  const orgId = user.org?.id ?? null;
  const [credits, days, [dictation]] = await Promise.all([
    loadCredits(user),
    db()`
      with days as (
        select generate_series(
          (now() at time zone 'Asia/Kolkata')::date - 29,
          (now() at time zone 'Asia/Kolkata')::date,
          interval '1 day'
        )::date as day
      )
      select to_char(days.day, 'YYYY-MM-DD') as day,
             count(e.id) filter (where e.user_id = ${user.id})::int as mine,
             count(e.id) filter (where e.user_id is distinct from ${user.id})::int as others
      from days
      left join usage_events e
        on e.purpose = 'report'
       and e.created_at >= (days.day::timestamp at time zone 'Asia/Kolkata')
       and e.created_at < ((days.day + 1)::timestamp at time zone 'Asia/Kolkata')
       and (case when ${orgId}::uuid is null then e.user_id = ${user.id} else e.org_id = ${orgId}::uuid end)
      group by days.day
      order by days.day
    `,
    db()`
      select coalesce(sum(seconds), 0)::int as seconds from usage_events
      where user_id = ${user.id} and provider = 'deepgram'
        and created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')
    `,
  ]);
  return {
    credits,
    days: days as UsageDay[],
    dictationSeconds: dictation?.seconds ?? 0,
  };
}
