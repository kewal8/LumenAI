import { ArrowRight, Gift } from "@phosphor-icons/react/dist/ssr";
import { StatTile, compact } from "@/components/admin/parts";
import { ListFilter } from "@/components/app/ListControls";
import { PagedList } from "@/components/app/PagedList";
import { Badge, Chip, EmptyState, LIST_HEAD, Page, PageHeader, formatDate } from "@/components/app/ui";
import { requireStaff } from "@/lib/auth/session";
import { readListParams } from "@/lib/listQuery";
import { PLANS } from "@/lib/plans";
import { BONUS_DAYS, pageReferrals, referralTotals, rewardFor } from "@/lib/referrals";

// Live referral data on every visit.
export const instant = false;

export const metadata = { title: "Referrals · Radmatic Admin" };

const number = (value: number) => value.toLocaleString("en-IN");

// Every row and the headings above it share these columns. Below xl each referral is a compact row.
const COLUMNS =
  "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_7.5rem_9rem_7.5rem] xl:items-center xl:gap-x-5";

function Cell({ label, number, children }: { label: string; number?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`flex items-baseline gap-1.5 text-[0.9rem] font-semibold xl:block xl:text-[0.95rem] ${
        number ? "tabular-nums xl:text-right" : ""
      }`}
    >
      <span className="text-[0.82rem] font-medium text-ink-soft xl:hidden">{label}</span>
      {children}
    </span>
  );
}

function Person({ name, email }: { name: string | null; email: string | null }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-semibold">{name ?? "Person removed"}</span>
      {email && <span className="block truncate text-[0.9rem] text-ink-soft">{email}</span>}
    </span>
  );
}

export default async function AdminReferralsPage({ searchParams }: PageProps<"/admin/referrals">) {
  await requireStaff();
  const params = readListParams(await searchParams, {
    sorts: ["created"],
    sort: "created",
    dir: "desc",
    filters: ["status"],
  });
  const [totals, { rows, total }] = await Promise.all([referralTotals(), pageReferrals(params)]);

  return (
    <Page>
      <PageHeader
        title="Referrals"
        description={`A referrer gets half a month of the referred account's plan (${PLANS.map(
          (plan) => `${plan.name} ${number(rewardFor(plan))}`,
        ).join(", ")} AI updates) when that account's first plan is activated. Rewards last ${BONUS_DAYS} days.`}
      />

      <section aria-label="Referrals in numbers" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Referrals made"
          figure={{ main: number(totals.created) }}
          detail="Accounts that joined or paid with a code"
        />
        <StatTile
          title="Rewarded"
          figure={{ main: number(totals.rewarded) }}
          detail={`${number(totals.rewardedPeople)} ${totals.rewardedPeople === 1 ? "person" : "people"} got a reward`}
        />
        <StatTile
          title="Updates given"
          figure={{ main: compact(totals.granted) }}
          detail="Bonus AI updates across every reward"
        />
        <StatTile
          title="Still unused"
          figure={{ main: compact(totals.unused) }}
          detail="Bonus updates not yet used or lapsed"
        />
      </section>

      {totals.created === 0 ? (
        <EmptyState
          icon={<Gift weight="fill" className="h-5 w-5" />}
          title="No referrals yet"
          body="When someone signs up or pays with a referral code, it shows here."
        />
      ) : (
        <PagedList
          path="/admin/referrals"
          params={params}
          total={total}
          placeholder="Search by code, name or email"
          noun="referrals"
          single="referral"
          filters={
            <ListFilter
              path="/admin/referrals"
              params={params}
              name="status"
              label="Status"
              options={[
                { value: "", text: "All referrals" },
                { value: "paid", text: "Rewarded" },
                { value: "waiting", text: "Not paid yet" },
              ]}
            />
          }
          head={
            <div aria-hidden="true" className={`${COLUMNS} ${LIST_HEAD}`}>
              <span>Referred by</span>
              <span>New account</span>
              <span>Code</span>
              <span>Joined</span>
              <span>Status</span>
              <span className="text-right">Reward</span>
            </div>
          }
        >
          {rows.map((row) => (
            <li
              key={row.id}
              className={`${COLUMNS} flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-line px-4 py-3.5 first:border-t-0 sm:px-6 xl:py-4`}
            >
              <span className="flex min-w-0 basis-full items-center gap-3 xl:basis-auto">
                <Person name={row.referrer} email={row.referrerEmail} />
                <ArrowRight weight="bold" aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-quiet xl:hidden" />
              </span>
              <span className="min-w-0 basis-full xl:basis-auto">
                <Person name={row.referred} email={row.referredEmail} />
              </span>
              <Cell label="Code">
                <Chip>{row.code}</Chip>
              </Cell>
              <Cell label="Joined">
                {formatDate(row.createdAt)}
                <span className="block text-[0.82rem] font-medium text-ink-soft">
                  {row.source === "signup" ? "at sign-up" : "on Plans"}
                </span>
              </Cell>
              <Cell label="Status">
                {row.rewardedAt ? (
                  <Badge tone="teal">Rewarded {formatDate(row.rewardedAt)}</Badge>
                ) : (
                  <Badge tone="amber">Not paid yet</Badge>
                )}
              </Cell>
              <Cell label="Reward" number>
                {row.credits ? `+${number(row.credits)}${row.plan ? ` (${row.plan.name})` : ""}` : "None yet"}
              </Cell>
            </li>
          ))}
        </PagedList>
      )}
    </Page>
  );
}
