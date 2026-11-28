import { db } from "@/lib/db";
import { likePattern, offsetOf, type ListParams, type Paged } from "@/lib/listQuery";
import { claudeCost, deepgramCost } from "@/lib/usage";

// Day boundaries follow India time, where the doctors are.
const ZONE = "Asia/Kolkata";

/** Everything the founder dashboard shows. Radmatic staff accounts are left out of doctor counts. */
export async function getDashboard() {
  const sql = db();
  const [[accounts], [doctors], [activity], [content], [demo], [invites], models, [speech], daily, top, hours, recent] =
    await Promise.all([
      sql`
        select count(*) filter (where o.kind = 'centre')::int as centres,
               count(*) filter (where o.kind = 'solo')::int as personal
        from organizations o
        where exists (
          select 1 from memberships m join users u on u.id = m.user_id
          where m.org_id = o.id and not u.is_platform_admin
        )
      `,
      sql`
        select count(*)::int as total,
               count(*) filter (where created_at > now() - interval '30 days')::int as new_30,
               count(*) filter (where disabled_at is not null)::int as turned_off,
               count(*) filter (where last_login_at > now() - interval '7 days')::int as signed_in_7
        from users where not is_platform_admin
      `,
      sql`
        select count(*) filter (where e.created_at > now() - interval '30 days')::int as updates_30,
               count(*) filter (where e.created_at > now() - interval '7 days')::int as updates_7,
               count(distinct e.user_id) filter (where e.created_at > now() - interval '7 days')::int as active_7
        from usage_events e left join users u on u.id = e.user_id
        where e.purpose = 'report' and coalesce(not u.is_platform_admin, true)
          -- Nothing older is counted, so nothing older is read.
          and e.created_at > now() - interval '30 days'
      `,
      sql`
        select (select count(*)::int from reports) as saved_reports,
               (select count(*)::int from templates) as templates
      `,
      sql`
        select count(*) filter (where status = 'new')::int as waiting,
               count(*) filter (where created_at > now() - interval '7 days')::int as last_7,
               count(*)::int as total
        from demo_requests where status <> 'spam'
      `,
      sql`select count(*)::int as pending from invites where accepted_at is null and expires_at > now()`,
      sql`
        select model, count(*)::int as calls,
               sum(input_tokens)::bigint as input, sum(output_tokens)::bigint as output
        from usage_events
        where provider = 'claude' and created_at > now() - interval '30 days'
        group by model order by sum(input_tokens + output_tokens) desc
      `,
      sql`
        select count(*)::int as sessions, coalesce(sum(seconds), 0)::int as seconds
        from usage_events
        where provider = 'deepgram' and created_at > now() - interval '30 days'
      `,
      sql`
        select to_char(day, 'YYYY-MM-DD') as day, coalesce(count(e.id), 0)::int as updates
        from generate_series(
          (now() at time zone ${ZONE})::date - 13, (now() at time zone ${ZONE})::date, interval '1 day'
        ) as day
        left join usage_events e
          on e.purpose = 'report' and (e.created_at at time zone ${ZONE})::date = day::date
          -- A day more than the chart shows, so the index on created_at narrows the read.
          and e.created_at > now() - interval '15 days'
        group by day order by day
      `,
      sql`
        select o.id, o.name, o.kind,
               count(*) filter (where e.purpose = 'report')::int as updates,
               coalesce(sum(e.input_tokens + e.output_tokens), 0)::bigint as tokens,
               coalesce(sum(e.seconds), 0)::int as seconds
        from usage_events e join organizations o on o.id = e.org_id
        where e.created_at > now() - interval '30 days'
        group by o.id order by count(*) filter (where e.purpose = 'report') desc, sum(e.seconds) desc
        limit 5
      `,
      // When doctors report: weekday (1 = Monday) by four-hour block of the day.
      sql`
        select extract(isodow from created_at at time zone ${ZONE})::int as weekday,
               floor(extract(hour from created_at at time zone ${ZONE}) / 4)::int as block,
               count(*)::int as updates
        from usage_events
        where purpose = 'report' and created_at > now() - interval '30 days'
        group by 1, 2
      `,
      sql`
        select id, name, organisation, organisation_type, status, created_at
        from demo_requests where status <> 'spam'
        order by created_at desc limit 5
      `,
    ]);

  const claude = models.map((row) => {
    const input = Number(row.input);
    const output = Number(row.output);
    return { model: row.model as string, calls: row.calls as number, input, output, cost: claudeCost(row.model, input, output) };
  });
  const claudeCostTotal = claude.every((row) => row.cost !== null)
    ? claude.reduce((sum, row) => sum + (row.cost ?? 0), 0)
    : null;

  return {
    accounts: { centres: accounts.centres as number, personal: accounts.personal as number },
    doctors: {
      total: doctors.total as number,
      new30: doctors.new_30 as number,
      turnedOff: doctors.turned_off as number,
      signedIn7: doctors.signed_in_7 as number,
      active7: activity.active_7 as number,
    },
    updates: { last30: activity.updates_30 as number, last7: activity.updates_7 as number },
    content: { savedReports: content.saved_reports as number, templates: content.templates as number },
    demo: { waiting: demo.waiting as number, last7: demo.last_7 as number, total: demo.total as number },
    pendingInvites: invites.pending as number,
    claude: {
      models: claude,
      calls: claude.reduce((sum, row) => sum + row.calls, 0),
      input: claude.reduce((sum, row) => sum + row.input, 0),
      output: claude.reduce((sum, row) => sum + row.output, 0),
      cost: claudeCostTotal,
    },
    speech: {
      sessions: speech.sessions as number,
      seconds: speech.seconds as number,
      cost: deepgramCost(speech.seconds as number),
    },
    daily: daily.map((row) => ({ day: row.day as string, updates: row.updates as number })),
    hours: hours.map((row) => ({
      weekday: row.weekday as number,
      block: row.block as number,
      updates: row.updates as number,
    })),
    recentDemo: recent.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      organisation: (row.organisation ?? row.organisation_type ?? "") as string,
      status: row.status as string,
      createdAt: (row.created_at as Date).toISOString(),
    })),
    top: top.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      kind: row.kind as "solo" | "centre",
      updates: row.updates as number,
      tokens: Number(row.tokens),
      seconds: row.seconds as number,
    })),
  };
}

export type AccountRow = {
  id: string;
  name: string;
  kind: "solo" | "centre";
  createdAt: string;
  updates30: number;
  seconds30: number;
  members: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    staff: boolean;
    disabled: boolean;
    lastLogin: string | null;
    updates30: number;
    seconds30: number;
  }[];
};

/**
 * One page of organisations with their people and their last 30 days of use.
 * The search finds an account by its name or by any of its people.
 */
export async function pageAccounts(params: ListParams): Promise<Paged<AccountRow>> {
  const sql = db();
  const like = likePattern(params.q);
  const kind = params.filter.kind === "centre" || params.filter.kind === "solo" ? params.filter.kind : "";
  const orgs = await sql`
      select o.id, o.name, o.kind, o.created_at,
             (select count(*)::int from usage_events e
               where e.org_id = o.id and e.purpose = 'report'
                 and e.created_at > now() - interval '30 days') as updates_30,
             (select coalesce(sum(seconds), 0)::int from usage_events e
               where e.org_id = o.id and e.created_at > now() - interval '30 days') as seconds_30,
             count(*) over () as total
      from organizations o
      where (${kind} = '' or o.kind = ${kind})
        and (${params.q} = '' or o.name ilike ${like} or exists (
          select 1 from memberships m join users u on u.id = m.user_id
          where m.org_id = o.id and (u.name ilike ${like} or u.email ilike ${like} or coalesce(u.phone, '') ilike ${like})
        ))
      order by
        case when ${params.sort} = 'name' and ${params.dir} = 'asc' then lower(o.name) end asc,
        case when ${params.sort} = 'name' and ${params.dir} = 'desc' then lower(o.name) end desc,
        case when ${params.sort} = 'created' and ${params.dir} = 'asc' then o.created_at end asc,
        case when ${params.sort} = 'created' and ${params.dir} = 'desc' then o.created_at end desc,
        o.id
      limit ${params.size} offset ${offsetOf(params)}
    `;
  const ids = orgs.map((org) => org.id as string);
  const [members] = await Promise.all([
    sql`
      select m.org_id, m.role, u.id, u.name, u.email, u.phone, u.is_platform_admin, u.disabled_at, u.last_login_at,
             (select count(*)::int from usage_events e
               where e.user_id = u.id and e.org_id = m.org_id and e.purpose = 'report'
                 and e.created_at > now() - interval '30 days') as updates_30,
             (select coalesce(sum(seconds), 0)::int from usage_events e
               where e.user_id = u.id and e.org_id = m.org_id
                 and e.created_at > now() - interval '30 days') as seconds_30
      from memberships m join users u on u.id = m.user_id
      where m.org_id = any(${ids})
      order by array_position(array['owner', 'admin', 'radiologist'], m.role), u.name
    `,
  ]);

  const rows = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    kind: org.kind,
    createdAt: org.created_at.toISOString(),
    updates30: org.updates_30,
    seconds30: org.seconds_30,
    members: members
      .filter((member) => member.org_id === org.id)
      .map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone ?? null,
        role: member.role,
        staff: member.is_platform_admin,
        disabled: member.disabled_at !== null,
        lastLogin: member.last_login_at?.toISOString() ?? null,
        updates30: member.updates_30,
        seconds30: member.seconds_30,
      })),
  })) as AccountRow[];
  return { rows, total: Number(orgs[0]?.total ?? 0) };
}

/** How many accounts and people there are in all, for the page header. */
export async function accountTotals() {
  const [row] = await db()`
    select (select count(*)::int from organizations) as accounts, (select count(*)::int from memberships) as people
  `;
  return { accounts: row?.accounts ?? 0, people: row?.people ?? 0 };
}

export async function listPendingInvites() {
  const rows = await db()`
    select i.id, i.email, i.org_name, i.expires_at, o.name as joins
    from invites i left join organizations o on o.id = i.org_id
    where i.accepted_at is null and i.expires_at > now()
    order by i.created_at desc
    limit 20
  `;
  return rows.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    // What the invitation will create or join.
    target: (row.joins ?? row.org_name ?? "Personal account") as string,
    expiresAt: (row.expires_at as Date).toISOString(),
  }));
}
