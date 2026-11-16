import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { likePattern, offsetOf, type ListParams, type Paged } from "@/lib/listQuery";
import { findPlan, type Plan } from "@/lib/plans";

// Referrals: a person shares their code; an account that signs up or pays
// with it is "referred". When that account's first paid plan is activated,
// the referrer's account gets bonus AI updates worth half a month of the plan
// paid for. Renewals and later plan changes pay nothing more.

/** Share of one month of the referred account's plan given to the referrer. */
export const REFERRAL_SHARE = 0.5;
/** Days a reward can be used before it lapses. */
export const BONUS_DAYS = 90;

/** Bonus AI updates earned when an account on this plan pays for the first time. */
export function rewardFor(plan: Plan) {
  return Math.round(plan.creditsPerDay * 30 * REFERRAL_SHARE);
}

/** A typed code as stored: capitals and digits only. Empty when nothing usable was typed. */
export function normaliseCode(value: unknown) {
  return typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) : "";
}

// Email services anyone can use; two people on these are not the same practice.
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "zoho.com",
  "zohomail.in",
]);

function domainOf(email: string) {
  return email.toLowerCase().split("@")[1] ?? "";
}

export type Referrer = { userId: string; name: string; email: string; orgId: string | null; code: string };

/** The person a code belongs to, if it is a real code of someone who can still sign in. */
export async function findReferrer(code: string): Promise<Referrer | null> {
  if (!code) return null;
  const [row] = await db()`
    select u.id, u.name, u.email, u.referral_code,
           (select m.org_id from memberships m where m.user_id = u.id order by m.created_at limit 1) as org_id
    from users u
    where u.referral_code = ${code} and u.disabled_at is null
  `;
  return row
    ? { userId: row.id, name: row.name, email: row.email, orgId: row.org_id ?? null, code: row.referral_code }
    : null;
}

/**
 * Why this referrer cannot be used by this account, or null when they can.
 * Nobody can refer their own account, or a colleague on the same work email.
 */
export function referralProblem(referrer: Referrer, referred: { orgId: string | null; email: string }) {
  if (referred.orgId && referrer.orgId === referred.orgId) return "You cannot use a code from your own account.";
  if (referrer.email.toLowerCase() === referred.email.toLowerCase()) return "You cannot use your own code.";
  const domain = domainOf(referred.email);
  if (domain && !PUBLIC_DOMAINS.has(domain) && domain === domainOf(referrer.email)) {
    return "This code belongs to someone at your own practice, so it cannot be used.";
  }
  return null;
}

/**
 * Notes that an account was referred. Entering a new code replaces the
 * earlier one, until the account's first plan has been paid for.
 */
export async function recordReferral(input: {
  referrer: Referrer;
  referredOrgId: string;
  referredUserId: string;
  source: "signup" | "plans";
}) {
  await db()`
    insert into referrals (code, referrer_user_id, referrer_org_id, referred_org_id, referred_user_id, source)
    values (${input.referrer.code}, ${input.referrer.userId}, ${input.referrer.orgId}, ${input.referredOrgId},
            ${input.referredUserId}, ${input.source})
    on conflict (referred_org_id) do update
      set code = excluded.code,
          referrer_user_id = excluded.referrer_user_id,
          referrer_org_id = excluded.referrer_org_id,
          referred_user_id = excluded.referred_user_id,
          source = excluded.source,
          created_at = now()
      where referrals.rewarded_at is null
  `;
}

/** The code this account was referred with, and whether it can still be changed. */
export async function loadAppliedReferral(orgId: string) {
  const [[row], [subscription]] = await Promise.all([
    db()`
      select r.code, r.rewarded_at, u.name as referrer_name
      from referrals r left join users u on u.id = r.referrer_user_id
      where r.referred_org_id = ${orgId}
    `,
    db()`select plan from subscriptions where org_id = ${orgId}`,
  ]);
  // Once a paid plan has been activated (even one that has since ended) the
  // first payment is past, so the code is final. 'pilot' is not a paid plan.
  const paid = findPlan(subscription?.plan) !== null || Boolean(row?.rewarded_at);
  return {
    code: (row?.code as string | undefined) ?? null,
    referrerName: (row?.referrer_name as string | undefined) ?? null,
    canChange: !paid,
  };
}

export type AppliedReferral = Awaited<ReturnType<typeof loadAppliedReferral>>;

/**
 * Gives the referrer their reward when a referred account's first plan is
 * activated. Runs as one statement, so activating twice never pays twice.
 * Returns the number of bonus updates given (0 when nothing was due).
 */
export async function rewardReferral(orgId: string, plan: Plan) {
  const credits = rewardFor(plan);
  const rows = await db()`
    with due as (
      update referrals
        set rewarded_at = now(), reward_plan = ${plan.id}, reward_credits = ${credits}
      where referred_org_id = ${orgId} and rewarded_at is null and referrer_org_id is not null
      returning id, referrer_org_id
    )
    insert into bonus_credits (org_id, referral_id, granted, remaining, expires_at)
    select referrer_org_id, id, ${credits}, ${credits}, now() + ${`${BONUS_DAYS} days`}::interval from due
    returning id
  `;
  return rows.length > 0 ? credits : 0;
}

/** Bonus AI updates the account has not used yet, and when the soonest of them lapse. */
export async function bonusBalance(orgId: string) {
  const [row] = await db()`
    select coalesce(sum(remaining), 0)::int as remaining, min(expires_at) as next_expiry
    from bonus_credits where org_id = ${orgId} and remaining > 0 and expires_at > now()
  `;
  return {
    remaining: (row?.remaining as number | undefined) ?? 0,
    nextExpiry: row?.next_expiry ? (row.next_expiry as Date).toISOString() : null,
  };
}

/** Uses one bonus update, from the reward that lapses soonest. */
export async function spendBonus(orgId: string) {
  await db()`
    update bonus_credits set remaining = remaining - 1
    where id = (
      select id from bonus_credits
      where org_id = ${orgId} and remaining > 0 and expires_at > now()
      order by expires_at, id limit 1
    ) and remaining > 0
  `;
}

export type MyReferral = {
  id: string;
  name: string;
  joinedAt: string;
  rewardedAt: string | null;
  plan: Plan | null;
  credits: number | null;
};

/** One person's code, what it has brought in, and one page of the accounts they referred. */
export async function loadMyReferrals(user: CurrentUser, params: ListParams) {
  const sql = db();
  const like = likePattern(params.q);
  const [[me], [totals], rows, bonus] = await Promise.all([
    sql`select referral_code from users where id = ${user.id}`,
    sql`
      select count(*)::int as joined,
             count(rewarded_at)::int as paid,
             coalesce(sum(reward_credits), 0)::int as earned
      from referrals where referrer_user_id = ${user.id}
    `,
    sql`
      select r.id, r.created_at, r.rewarded_at, r.reward_plan, r.reward_credits,
             coalesce(o.name, 'Account removed') as name, count(*) over () as total
      from referrals r left join organizations o on o.id = r.referred_org_id
      where r.referrer_user_id = ${user.id}
        and (${params.q} = '' or o.name ilike ${like})
        and (${params.filter.status ?? ""} = ''
             or (${params.filter.status ?? ""} = 'paid' and r.rewarded_at is not null)
             or (${params.filter.status ?? ""} = 'waiting' and r.rewarded_at is null))
      order by r.created_at desc, r.id
      limit ${params.size} offset ${offsetOf(params)}
    `,
    user.org ? bonusBalance(user.org.id) : Promise.resolve({ remaining: 0, nextExpiry: null }),
  ]);
  return {
    code: me.referral_code as string,
    joined: totals.joined as number,
    paid: totals.paid as number,
    earned: totals.earned as number,
    bonus,
    page: {
      total: rows.length ? Number(rows[0].total) : 0,
      rows: rows.map(
        (row): MyReferral => ({
          id: row.id,
          name: row.name,
          joinedAt: (row.created_at as Date).toISOString(),
          rewardedAt: row.rewarded_at ? (row.rewarded_at as Date).toISOString() : null,
          plan: findPlan(row.reward_plan),
          credits: row.reward_credits ?? null,
        }),
      ),
    } satisfies Paged<MyReferral>,
  };
}

/** Headline numbers for the admin panel. */
export async function referralTotals() {
  const [row] = await db()`
    select
      (select count(*)::int from referrals) as created,
      (select count(*)::int from referrals where rewarded_at is not null) as rewarded,
      (select count(distinct referrer_user_id)::int from referrals where rewarded_at is not null) as rewarded_people,
      (select coalesce(sum(reward_credits), 0)::int from referrals) as granted,
      (select coalesce(sum(remaining), 0)::int from bonus_credits where remaining > 0 and expires_at > now()) as unused
  `;
  return {
    created: row.created as number,
    rewarded: row.rewarded as number,
    rewardedPeople: row.rewarded_people as number,
    granted: row.granted as number,
    unused: row.unused as number,
  };
}

export type ReferralRow = {
  id: string;
  code: string;
  referrer: string | null;
  referrerEmail: string | null;
  referred: string;
  referredEmail: string | null;
  source: "signup" | "plans";
  createdAt: string;
  rewardedAt: string | null;
  plan: Plan | null;
  credits: number | null;
};

/** One page of every referral, newest first, for the admin panel. */
export async function pageReferrals(params: ListParams): Promise<Paged<ReferralRow>> {
  const like = likePattern(params.q);
  const status = params.filter.status ?? "";
  const rows = await db()`
    select r.id, r.code, r.source, r.created_at, r.rewarded_at, r.reward_plan, r.reward_credits,
           ru.name as referrer_name, ru.email as referrer_email,
           coalesce(o.name, 'Account removed') as referred_name, du.email as referred_email,
           count(*) over () as total
    from referrals r
    left join users ru on ru.id = r.referrer_user_id
    left join users du on du.id = r.referred_user_id
    left join organizations o on o.id = r.referred_org_id
    where (${status} = ''
           or (${status} = 'paid' and r.rewarded_at is not null)
           or (${status} = 'waiting' and r.rewarded_at is null))
      and (${params.q} = '' or r.code ilike ${like} or ru.name ilike ${like} or ru.email ilike ${like}
           or o.name ilike ${like} or du.email ilike ${like})
    order by
      case when ${params.sort} = 'created' and ${params.dir} = 'asc' then r.created_at end asc,
      case when ${params.sort} = 'created' and ${params.dir} = 'desc' then r.created_at end desc,
      r.id
    limit ${params.size} offset ${offsetOf(params)}
  `;
  return {
    total: rows.length ? Number(rows[0].total) : 0,
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      referrer: row.referrer_name ?? null,
      referrerEmail: row.referrer_email ?? null,
      referred: row.referred_name,
      referredEmail: row.referred_email ?? null,
      source: row.source,
      createdAt: (row.created_at as Date).toISOString(),
      rewardedAt: row.rewarded_at ? (row.rewarded_at as Date).toISOString() : null,
      plan: findPlan(row.reward_plan),
      credits: row.reward_credits ?? null,
    })),
  };
}
