import { db } from "@/lib/db";

export type ErrorSource = "page" | "api" | "ai";

const MESSAGE_LIMIT = 300;

/**
 * Notes a server failure for the admin dashboard. Never throws: failing to
 * record a problem must not cause a second one. The address is kept without
 * its query, which can hold what someone searched for.
 */
export async function recordError(
  source: ErrorSource,
  where: { method?: string; path?: string },
  error: unknown,
) {
  try {
    const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, MESSAGE_LIMIT);
    const digest =
      typeof error === "object" && error !== null && "digest" in error ? String(error.digest).slice(0, 60) : null;
    const path = where.path ? where.path.split("?")[0].slice(0, 200) : null;
    await db()`
      insert into error_events (source, method, path, message, digest)
      values (${source}, ${where.method ?? null}, ${path}, ${message}, ${digest})
    `;
  } catch (cause) {
    console.error("Could not record an error:", cause);
  }
}

/** The path of a request, for `recordError`. */
export function pathOf(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return undefined;
  }
}

export type Health = {
  errors: { last24h: number; last7d: number };
  /** Seconds an AI report update takes, over the last 7 days; null until some are timed. */
  ai: { typical: number; slow: number; timed: number } | null;
  recent: { id: string; at: string; source: ErrorSource; path: string | null; message: string }[];
};

/** What the admin dashboard shows about how well the service is running. */
export async function getHealth(): Promise<Health> {
  const sql = db();
  const [[errors], [ai], recent] = await Promise.all([
    sql`
      select count(*) filter (where created_at > now() - interval '24 hours')::int as last_24h,
             count(*)::int as last_7d
      from error_events where created_at > now() - interval '7 days'
    `,
    sql`
      select count(*)::int as timed,
             percentile_cont(0.5) within group (order by duration_ms) as typical,
             percentile_cont(0.95) within group (order by duration_ms) as slow
      from usage_events
      where purpose = 'report' and duration_ms is not null and created_at > now() - interval '7 days'
    `,
    sql`select id, created_at, source, path, message from error_events order by created_at desc limit 5`,
  ]);
  return {
    errors: { last24h: errors?.last_24h ?? 0, last7d: errors?.last_7d ?? 0 },
    ai: ai?.timed > 0 ? { typical: Number(ai.typical) / 1000, slow: Number(ai.slow) / 1000, timed: ai.timed } : null,
    recent: recent.map((row) => ({
      id: String(row.id),
      at: (row.created_at as Date).toISOString(),
      source: row.source as ErrorSource,
      path: (row.path ?? null) as string | null,
      message: row.message as string,
    })),
  };
}
