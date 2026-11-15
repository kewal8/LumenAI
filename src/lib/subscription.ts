import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { findPlan, type Cycle, type Plan } from "./plans";

export type Subscription = {
  /** The plan in force, or null while the organisation is on the pilot or has not paid. */
  plan: Plan | null;
  cycle: Cycle | null;
  periodEnd: string | null;
  /** A plan that was asked for and is waiting to be paid and activated. */
  requested: { plan: Plan; cycle: Cycle; at: string } | null;
  /** True when the report editor is closed until a plan is active. */
  locked: boolean;
};

type Row = { status?: string; period_end?: Date | null } | undefined;

/**
 * Accounts from sign-up start unpaid, and a paid plan ends on its date. Older
 * accounts with no row are on the pilot and stay open.
 */
function isLocked(row: Row) {
  if (!row) return false;
  if (row.status === "unpaid" || row.status === "cancelled") return true;
  return row.status === "active" && Boolean(row.period_end && row.period_end.getTime() < Date.now());
}

export async function loadSubscription(orgId: string): Promise<Subscription> {
  const [row] = await db()`
    select plan, cycle, status, period_end, requested_plan, requested_cycle, requested_at
    from subscriptions where org_id = ${orgId}
  `;
  const requestedPlan = findPlan(row?.requested_plan);
  return {
    plan: row?.status === "active" ? findPlan(row.plan) : null,
    cycle: row?.status === "active" ? row.cycle : null,
    periodEnd: row?.period_end ? row.period_end.toISOString() : null,
    requested:
      requestedPlan && row.requested_cycle && row.requested_at
        ? { plan: requestedPlan, cycle: row.requested_cycle, at: row.requested_at.toISOString() }
        : null,
    locked: isLocked(row as Row),
  };
}

/** Sent back by the AI and speech routes while the editor is locked. */
export const LOCKED_MESSAGE = "Your plan is not active yet. Choose a plan on the Plans page to start reporting.";

/** Whether this person's report editor is closed. LumenAI staff are never locked out. */
export async function editorLocked(user: CurrentUser) {
  if (user.isPlatformAdmin || !user.org) return false;
  const [row] = await db()`select status, period_end from subscriptions where org_id = ${user.org.id}`;
  return isLocked(row as Row);
}

/** Records that an organisation wants a plan. Asking again replaces the earlier request. */
export async function requestPlan(orgId: string, userId: string, plan: Plan, cycle: Cycle) {
  await db()`
    insert into subscriptions (org_id, requested_plan, requested_cycle, requested_by, requested_at)
    values (${orgId}, ${plan.id}, ${cycle}, ${userId}, now())
    on conflict (org_id) do update
      set requested_plan = excluded.requested_plan,
          requested_cycle = excluded.requested_cycle,
          requested_by = excluded.requested_by,
          requested_at = excluded.requested_at,
          updated_at = now()
  `;
}

/**
 * Starts a paid plan for one month or one year from today. Used by LumenAI
 * staff after payment, until online payment is connected.
 */
export async function activatePlan(orgId: string, plan: Plan, cycle: Cycle) {
  const length = cycle === "yearly" ? "1 year" : "1 month";
  await db()`
    insert into subscriptions (org_id, plan, cycle, status, period_end)
    values (${orgId}, ${plan.id}, ${cycle}, 'active', now() + ${length}::interval)
    on conflict (org_id) do update
      set plan = excluded.plan,
          cycle = excluded.cycle,
          status = 'active',
          period_end = excluded.period_end,
          requested_plan = null,
          requested_cycle = null,
          requested_by = null,
          requested_at = null,
          updated_at = now()
  `;
}

/** Ends a plan now: the editor locks until a plan is activated again. */
export async function endPlan(orgId: string) {
  await db()`
    insert into subscriptions (org_id, status) values (${orgId}, 'unpaid')
    on conflict (org_id) do update set status = 'unpaid', updated_at = now()
  `;
}

/** Plan status of every organisation, for the admin panel. Organisations with no row are on the pilot. */
export async function listPlanStatus() {
  const rows = await db()`
    select org_id, plan, cycle, status, period_end, requested_plan, requested_cycle from subscriptions
  `;
  return new Map(
    rows.map((row) => [
      row.org_id as string,
      {
        status: (isLocked(row as Row) ? "locked" : row.status === "active" ? "active" : "pilot") as
          | "locked"
          | "active"
          | "pilot",
        plan: findPlan(row.plan),
        cycle: row.cycle as Cycle | null,
        periodEnd: row.period_end ? (row.period_end as Date).toISOString() : null,
        requested: findPlan(row.requested_plan),
        requestedCycle: row.requested_cycle as Cycle | null,
      },
    ]),
  );
}

export type PlanStatus = NonNullable<ReturnType<Awaited<ReturnType<typeof listPlanStatus>>["get"]>>;
