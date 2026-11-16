import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { BLANK_TEMPLATE } from "@/lib/templates";

/*
 * A doctor's own work, for the Insights page. Only their own reports count,
 * never a colleague's, and no patient detail leaves this file.
 *
 * Days are shift days in India: a day runs 6 am to 6 am, so a night shift
 * from 10 pm to 4 am counts as one day of work, not two.
 */

/** Below this many reports a share or a typical time would mislead. */
export const ENOUGH = 5;

export type WorkDay = { day: string; reports: number };
export type Share = { label: string; reports: number };

export type Insights = {
  /** Reports finalized on each of the last 30 shift days, oldest first. */
  days: WorkDay[];
  today: number;
  last30: number;
  /** The 30 days before those, for the trend. */
  previous30: number;
  /** Typical seconds from the first change to finalizing, with how many reports it is drawn from. */
  turnaround: {
    normal: { seconds: number | null; reports: number };
    abnormal: { seconds: number | null; reports: number };
  };
  /** Finalized reports with no abnormal line, of those started from a template. */
  normal: { reports: number; of: number };
  modalities: Share[];
  templates: Share[];
  /** The doctor's own templates, older than 60 days, not used in the last 60 days. */
  unusedTemplates: number;
};

// A shift day: Indian time, less six hours.
const SHIFT = "6 hours";

export async function loadInsights(user: CurrentUser): Promise<Insights> {
  const sql = db();
  const [days, [counts], timing, modalities, templates, [unused]] = await Promise.all([
    sql`
      with days as (
        select generate_series(
          (now() at time zone 'Asia/Kolkata' - ${SHIFT}::interval)::date - 29,
          (now() at time zone 'Asia/Kolkata' - ${SHIFT}::interval)::date,
          interval '1 day'
        )::date as day
      ),
      mine as (
        select (first_finalized_at at time zone 'Asia/Kolkata' - ${SHIFT}::interval)::date as day
        from reports
        where user_id = ${user.id} and first_finalized_at > now() - interval '32 days'
      )
      select to_char(days.day, 'YYYY-MM-DD') as day, count(mine.day)::int as reports
      from days left join mine on mine.day = days.day
      group by days.day order by days.day
    `,
    sql`
      select
        count(*) filter (where shift_day > today - 30)::int as last30,
        count(*) filter (where shift_day <= today - 30)::int as previous30
      from (
        select (first_finalized_at at time zone 'Asia/Kolkata' - ${SHIFT}::interval)::date as shift_day,
               (now() at time zone 'Asia/Kolkata' - ${SHIFT}::interval)::date as today
        from reports
        where user_id = ${user.id} and first_finalized_at > now() - interval '62 days'
      ) r
      where shift_day > today - 60
    `,
    // The middle time, not the average: a draft left open over lunch would drag an average.
    // Anything over two hours was not one sitting, so it is left out.
    sql`
      select findings = 0 as normal,
             count(*)::int as reports,
             percentile_cont(0.5) within group (order by extract(epoch from first_finalized_at - started_at)) as seconds
      from reports
      where user_id = ${user.id} and first_finalized_at > now() - interval '30 days'
        and started_at is not null and template_name <> ${BLANK_TEMPLATE.name}
        and first_finalized_at - started_at between interval '5 seconds' and interval '2 hours'
      group by findings = 0
    `,
    sql`
      select coalesce(nullif(modality, ''), 'Not set') as label, count(*)::int as reports,
             count(*) filter (where findings = 0 and template_name <> ${BLANK_TEMPLATE.name})::int as normal,
             count(*) filter (where template_name <> ${BLANK_TEMPLATE.name})::int as templated
      from reports
      where user_id = ${user.id} and first_finalized_at > now() - interval '30 days'
      group by 1 order by 2 desc
    `,
    sql`
      select template_name as label, count(*)::int as reports
      from reports
      where user_id = ${user.id} and first_finalized_at > now() - interval '30 days'
      group by 1 order by 2 desc, 1 limit 5
    `,
    sql`
      select count(*)::int as count from templates t
      where t.owner_id = ${user.id} and t.created_at < now() - interval '60 days'
        and not exists (
          select 1 from reports r
          where r.user_id = ${user.id} and r.template_name = t.name and r.created_at > now() - interval '60 days'
        )
    `,
  ]);

  const timed = (normal: boolean) => {
    const row = timing.find((entry) => entry.normal === normal);
    return { seconds: row?.seconds == null ? null : Math.round(Number(row.seconds)), reports: row?.reports ?? 0 };
  };
  const shares = modalities as (Share & { normal: number; templated: number })[];

  return {
    days: days as WorkDay[],
    today: (days as WorkDay[]).at(-1)?.reports ?? 0,
    last30: counts?.last30 ?? 0,
    previous30: counts?.previous30 ?? 0,
    turnaround: { normal: timed(true), abnormal: timed(false) },
    normal: {
      reports: shares.reduce((sum, row) => sum + row.normal, 0),
      of: shares.reduce((sum, row) => sum + row.templated, 0),
    },
    modalities: shares.map(({ label, reports }) => ({ label, reports })),
    templates: templates as Share[],
    unusedTemplates: unused?.count ?? 0,
  };
}
