import { db } from "@/lib/db";
import { findPlan, type Cycle, type Plan } from "./plans";

export type Subscription = {
  /** The plan in force, or null while the organisation is on the pilot. */
  plan: Plan | null;
  cycle: Cycle | null;
  periodEnd: string | null;
  /** A plan that was asked for and is waiting to be activated. */
  requested: { plan: Plan; cycle: Cycle; at: string } | null;
};

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
  };
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
