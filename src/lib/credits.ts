// AI update counts, shared by the server and the screens that show them.

/**
 * AI updates for today. `limit` is the plan's daily number (null on the pilot,
 * which has none); `bonus` is referral bonus updates still unused, spent only
 * once the day's `limit` is used up.
 */
export type Credits = { limit: number | null; used: number; bonus: number };

/** How many more AI updates can be made today, or null when there is no limit. */
export function updatesLeft(credits: Credits) {
  if (credits.limit === null) return null;
  return Math.max(0, credits.limit - credits.used) + credits.bonus;
}

/** The counts after one more AI update: past the daily number, it comes from the bonus. */
export function afterOneUpdate(credits: Credits): Credits {
  const fromBonus = credits.limit !== null && credits.used >= credits.limit && credits.bonus > 0;
  return { ...credits, used: credits.used + 1, bonus: fromBonus ? credits.bonus - 1 : credits.bonus };
}
