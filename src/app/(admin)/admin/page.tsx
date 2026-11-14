import Link from "next/link";
import {
  DailyBars,
  DotMatrix,
  Figure,
  Gauge,
  Row,
  StatTile,
  TileHeader,
  WeekHeatmap,
  compact,
  dollars,
  minutes,
} from "@/components/admin/parts";
import { Avatar, Badge, EmptyState, PANEL, Page, PageHeader, buttonClass, formatDate } from "@/components/app/ui";
import { getDashboard } from "@/lib/admin";
import { DEMO_STATUS_LABELS, type DemoStatus } from "@/lib/demo";

// Live numbers on every visit.
export const instant = false;

export const metadata = { title: "Dashboard · LumenAI Admin" };

export default async function AdminDashboardPage() {
  const data = await getDashboard();
  const accounts = data.accounts.centres + data.accounts.personal;
  const cost = data.claude.cost === null || data.speech.cost === null ? null : data.claude.cost + data.speech.cost;
  const perUpdate =
    data.claude.cost !== null && data.updates.last30 > 0 ? data.claude.cost / data.updates.last30 : null;
  const fortnight = data.daily.reduce((sum, point) => sum + point.updates, 0);

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        description="How LumenAI is used and what it costs to run. Usage covers the last 30 days."
        action={
          <Link href="/admin/accounts" className={buttonClass.primary}>
            Manage accounts
          </Link>
        }
      />

      <section aria-label="Headline numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Accounts"
          figure={{ main: String(accounts) }}
          detail={`${data.accounts.centres} ${data.accounts.centres === 1 ? "centre" : "centres"}, ${data.accounts.personal} personal`}
          href="/admin/accounts"
        />
        <StatTile
          title="Radiologists"
          figure={{ main: String(data.doctors.total) }}
          detail={`${data.doctors.new30} joined in the last 30 days`}
          href="/admin/accounts"
        />
        <StatTile
          title="Report updates"
          figure={{ main: compact(data.updates.last30) }}
          detail={`${data.updates.last7} in the last 7 days`}
        />
        <StatTile
          title="Running cost"
          figure={dollars(cost ?? data.claude.cost)}
          detail={
            cost === null
              ? "Claude only. Deepgram rate not set"
              : perUpdate === null
                ? "Claude and Deepgram"
                : `About $${perUpdate.toFixed(3)} of Claude per update`
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={`${PANEL} p-6 sm:p-8 lg:col-span-2`}>
          <TileHeader title="Report updates per day" />
          <div className="mb-7 mt-2 flex flex-wrap items-end justify-between gap-3">
            <Figure main={String(fortnight)} rest=" in 14 days" size="xl" />
            <p className="flex items-center gap-2 text-[0.88rem] font-semibold text-ink-soft">
              <span className="h-3 w-3 rounded-full bg-teal" aria-hidden="true" />
              Busiest day
            </p>
          </div>
          <DailyBars unit="updates" data={data.daily.map((point) => ({ day: point.day, value: point.updates }))} />
        </article>

        <article className={`${PANEL} flex flex-col p-6 sm:p-8`}>
          <TileHeader title="Reporting this week" href="/admin/accounts" />
          <div className="my-auto py-6">
            <Gauge
              part={data.doctors.active7}
              whole={data.doctors.total}
              caption={`${data.doctors.active7} of ${data.doctors.total} radiologists wrote a report in the last 7 days`}
            />
          </div>
          <DotMatrix filled={data.doctors.active7} total={Math.max(data.doctors.total, 1)} />
        </article>
      </section>

      <section aria-label="Running cost" className="grid gap-4 lg:grid-cols-3">
        <article className={`${PANEL} p-6 sm:p-8`}>
          <TileHeader title="Claude" />
          <p className="text-[0.9rem] text-ink-soft">Writes reports and converts templates</p>
          <div className="my-5">
            <Figure {...dollars(data.claude.cost)} />
          </div>
          <dl>
            <Row label="Tokens read" value={compact(data.claude.input)} />
            <Row label="Tokens written" value={compact(data.claude.output)} />
            <Row label="Requests" value={data.claude.calls.toLocaleString("en-IN")} />
            <Row label="Per report update" value={perUpdate === null ? "No data yet" : `$${perUpdate.toFixed(3)}`} />
          </dl>
          {data.claude.models.length > 1 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {data.claude.models.map((row) => (
                <Badge key={row.model}>
                  {row.model}: {row.calls}
                </Badge>
              ))}
            </p>
          )}
        </article>

        <article className={`${PANEL} p-6 sm:p-8`}>
          <TileHeader title="Deepgram" />
          <p className="text-[0.9rem] text-ink-soft">Turns speech into text</p>
          <div className="my-5">
            {data.speech.cost === null ? (
              <Figure main={minutes(data.speech.seconds)} />
            ) : (
              <Figure {...dollars(data.speech.cost)} />
            )}
          </div>
          <dl>
            <Row label="Listening time" value={minutes(data.speech.seconds)} />
            <Row label="Dictations" value={data.speech.sessions.toLocaleString("en-IN")} />
            <Row
              label="Average dictation"
              value={
                data.speech.sessions > 0
                  ? `${Math.round(data.speech.seconds / data.speech.sessions)} sec`
                  : "No data yet"
              }
            />
            <Row label="Cost" value={data.speech.cost === null ? "Rate not set" : `$${data.speech.cost.toFixed(2)}`} />
          </dl>
        </article>

        <article className={`${PANEL} p-6 sm:p-8`}>
          <TileHeader title="When doctors report" />
          <p className="mb-4 text-[0.9rem] text-ink-soft">Darker means more report updates. India time.</p>
          <WeekHeatmap cells={data.hours} />
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={`${PANEL} p-6 sm:p-8 lg:col-span-2`}>
          <TileHeader title="Latest demo requests" href="/admin/demo-requests">
            {data.demo.waiting > 0 && <Badge tone="amber">{data.demo.waiting} waiting</Badge>}
          </TileHeader>
          {data.recentDemo.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No demo requests yet"
                body="Requests from the Book a demo page appear here."
              />
            </div>
          ) : (
            <ul className="mt-4">
              {data.recentDemo.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3.5 first:border-t-0"
                >
                  <Avatar name={request.name} />
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate font-semibold">{request.name}</span>
                    <span className="block truncate text-[0.9rem] text-ink-soft">
                      {request.organisation || "No organisation given"}
                    </span>
                  </span>
                  <span className="w-28 text-[0.9rem] font-semibold text-ink-soft">
                    {formatDate(request.createdAt)}
                  </span>
                  <Badge tone={request.status === "new" ? "amber" : request.status === "done" ? "teal" : "neutral"}>
                    {DEMO_STATUS_LABELS[request.status as DemoStatus]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={`${PANEL} p-6 sm:p-8`}>
          <TileHeader title="Most active accounts" href="/admin/accounts" />
          {data.top.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="No activity yet" body="Accounts appear here once doctors start reporting." />
            </div>
          ) : (
            <ol className="mt-4">
              {data.top.map((account, index) => (
                <li
                  key={account.id}
                  className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.85rem] font-bold text-surface">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{account.name}</span>
                    <span className="block text-[0.88rem] text-ink-soft">{minutes(account.seconds)} dictated</span>
                  </span>
                  <span className="text-[1.05rem] font-bold tabular-nums">{account.updates}</span>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Saved reports", data.content.savedReports],
          ["Templates", data.content.templates],
          ["Invitations waiting", data.pendingInvites],
          ["Accounts turned off", data.doctors.turnedOff],
        ].map(([label, value]) => (
          <div key={label} className={`${PANEL} flex items-baseline justify-between gap-4 px-6 py-5`}>
            <p className="text-[0.98rem] font-semibold text-ink-soft">{label}</p>
            <p className="text-[1.6rem] font-bold tabular-nums tracking-[-0.02em]">{value}</p>
          </div>
        ))}
      </section>
    </Page>
  );
}
