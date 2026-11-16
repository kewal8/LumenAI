import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { loadSubscription } from "@/lib/subscription";
import { canManageTeam } from "@/lib/team";

/*
 * One-time greetings and reminders, each shown under its own condition and
 * remembered per person in user_moments once seen or put off.
 */

const DAY = 86_400_000;

/** A date as the doctor's calendar has it ("2026-11-24"); LumenAI works in India time. */
const indiaDate = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** Moment names a browser may mark: the first-report card, or a renewal reminder for one end date. */
export const MOMENT_NAME = /^(first-report|renew-(7|1):\d{4}-\d{2}-\d{2})$/;

async function settled(userId: string, moment: string) {
  const [row] = await db()`
    select seen_at, snooze_until from user_moments where user_id = ${userId} and moment = ${moment}
  `;
  return Boolean(row && (row.seen_at || (row.snooze_until && row.snooze_until.getTime() > Date.now())));
}

/** Records that a moment was seen, or puts it off for some hours. */
export async function markMoment(userId: string, moment: string, snoozeHours: number | null) {
  if (snoozeHours) {
    await db()`
      insert into user_moments (user_id, moment, snooze_until)
      values (${userId}, ${moment}, now() + ${`${snoozeHours} hours`}::interval)
      on conflict (user_id, moment) do update set snooze_until = excluded.snooze_until
    `;
  } else {
    await db()`
      insert into user_moments (user_id, moment, seen_at)
      values (${userId}, ${moment}, now())
      on conflict (user_id, moment) do update set seen_at = now()
    `;
  }
}

export type RenewalDue = {
  moment: string;
  /** Calendar days until the plan ends: 0 is today, 1 tomorrow. */
  daysLeft: number;
  planName: string;
  /** The plan's last day, formatted for the doctor. */
  endsOn: string;
  reports: number;
};

/**
 * The renewal reminder this person should see now, if any: only owners and
 * admins, only in the last 7 days of a paid plan, not once a renewal has been
 * asked for, and not again once seen or while put off.
 */
export async function renewalDue(user: CurrentUser): Promise<RenewalDue | null> {
  if (!user.org || !canManageTeam(user.org.role)) return null;
  const subscription = await loadSubscription(user.org.id);
  if (!subscription.plan || !subscription.periodEnd || subscription.requested || subscription.locked) return null;

  const end = new Date(subscription.periodEnd);
  if (end.getTime() <= Date.now()) return null;
  const daysLeft = Math.round((Date.parse(indiaDate(end)) - Date.parse(indiaDate(new Date()))) / DAY);
  if (daysLeft > 7) return null;

  const moment = `renew-${daysLeft <= 1 ? 1 : 7}:${indiaDate(end)}`;
  if (await settled(user.id, moment)) return null;

  // The plan's reports: everything finalised by the organisation since it began.
  const start = new Date(end);
  if (subscription.cycle === "yearly") start.setFullYear(start.getFullYear() - 1);
  else start.setMonth(start.getMonth() - 1);
  const [{ count }] = await db()`
    select count(*)::int as count from reports
    where org_id = ${user.org.id} and finalized_at >= ${start} and finalized_at < ${end}
  `;

  return {
    moment,
    daysLeft,
    planName: subscription.plan.name,
    endsOn: end.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
    reports: count,
  };
}

/**
 * The first-report card, if due: this person finalised their first report in
 * the last 14 days and has not seen the card. Older accounts never get it.
 * `took` is how long that report took, when the report screen timed it.
 */
export async function firstReportDue(user: CurrentUser): Promise<{ took: string | null } | null> {
  const [first] = await db()`
    select started_at, coalesce(first_finalized_at, finalized_at) as first_finalized_at from reports
    where user_id = ${user.id} and coalesce(first_finalized_at, finalized_at) is not null
    order by 2 asc
    limit 1
  `;
  if (!first || Date.now() - first.first_finalized_at.getTime() > 14 * DAY) return null;
  if (await settled(user.id, "first-report")) return null;

  const seconds = first.started_at
    ? Math.round((first.first_finalized_at.getTime() - first.started_at.getTime()) / 1000)
    : null;
  // A time is only worth showing when it is plausible: under an hour.
  const took =
    seconds && seconds > 0 && seconds < 3600
      ? seconds < 60
        ? `${seconds} s`
        : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ""}`
      : null;
  return { took };
}
