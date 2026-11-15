// The price list. Every price and allowance shown in the app comes from here,
// so changing a number in this file changes it everywhere.

export type Cycle = "monthly" | "yearly";

export type Plan = {
  id: "pro" | "max";
  name: string;
  /** Rupees a month before GST, paid monthly. */
  monthly: number;
  /** AI updates a day. One credit is one update of the report from a dictation. */
  creditsPerDay: number;
  /** One line on who it suits. */
  suits: string;
};

export const PLANS: Plan[] = [
  { id: "pro", name: "Pro", monthly: 1700, creditsPerDay: 100, suits: "A full day of reporting" },
  { id: "max", name: "Max", monthly: 3500, creditsPerDay: 300, suits: "High-volume and teleradiology" },
];

/** Paying for a year takes this much off every month. */
export const YEARLY_DISCOUNT = 0.2;
export const GST_RATE = 0.18;

export function findPlan(id: unknown) {
  return PLANS.find((plan) => plan.id === id) ?? null;
}

/** What one month costs on this cycle, before GST. */
export function monthlyPrice(plan: Plan, cycle: Cycle) {
  return cycle === "yearly" ? Math.round(plan.monthly * (1 - YEARLY_DISCOUNT)) : plan.monthly;
}

/** The amount paid at once for a year, before GST. */
export function yearlyPrice(plan: Plan) {
  return monthlyPrice(plan, "yearly") * 12;
}

export function yearlySaving(plan: Plan) {
  return plan.monthly * 12 - yearlyPrice(plan);
}

export function rupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)}`;
}
