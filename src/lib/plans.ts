// The price list. Every price and allowance shown in the app comes from here,
// so changing a number in this file changes it everywhere.

export type Cycle = "monthly" | "yearly";

export type Plan = {
  id: "starter" | "pro" | "max";
  name: string;
  /** Rupees a month before GST, paid monthly. */
  monthly: number;
  /** Reports included each month. */
  reports: number;
  /** One line on who it suits. */
  suits: string;
};

export const PLANS: Plan[] = [
  { id: "starter", name: "Starter", monthly: 999, reports: 300, suits: "Part-time and evening reporting" },
  { id: "pro", name: "Pro", monthly: 1999, reports: 800, suits: "A full day of reporting" },
  { id: "max", name: "Max", monthly: 3499, reports: 1800, suits: "High-volume and teleradiology" },
];

/** Paying for a year costs ten months: two months free. */
export const YEARLY_MONTHS_CHARGED = 10;
export const GST_RATE = 0.18;
/** Used to turn a monthly allowance into "about N a day". */
export const WORKING_DAYS = 25;

export const TOP_UP = { reports: 100, price: 299 };
export const TRIAL = { days: 14, reports: 50 };
export const CENTRE = { perDoctor: 1799, minimumDoctors: 5 };
export const RESIDENT = { monthly: 499, reports: 200 };

export function findPlan(id: unknown) {
  return PLANS.find((plan) => plan.id === id) ?? null;
}

/** What one month costs on this cycle, before GST. */
export function monthlyPrice(plan: Plan, cycle: Cycle) {
  return cycle === "yearly" ? Math.round((plan.monthly * YEARLY_MONTHS_CHARGED) / 12) : plan.monthly;
}

export function yearlySaving(plan: Plan) {
  return plan.monthly * (12 - YEARLY_MONTHS_CHARGED);
}

export function perReport(plan: Plan, cycle: Cycle) {
  return monthlyPrice(plan, cycle) / plan.reports;
}

/** The smallest plan that covers this many reports a working day, or null if none does. */
export function planFor(reportsPerDay: number) {
  return PLANS.find((plan) => plan.reports >= reportsPerDay * WORKING_DAYS) ?? null;
}

export function rupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)}`;
}
