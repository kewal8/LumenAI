import { CalendarBlank, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { ListFilter } from "@/components/app/ListControls";
import { PagedList } from "@/components/app/PagedList";
import { ReferralEmpty, ReferralShare, ReferralStats } from "@/components/app/Referrals";
import { Badge, IconTile, Meta, Page, PageHeader, formatDate } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { readListParams } from "@/lib/listQuery";
import { PLANS } from "@/lib/plans";
import { BONUS_DAYS, loadMyReferrals, rewardFor } from "@/lib/referrals";

// Live counts on every visit.
export const instant = false;

export const metadata = { title: "Referrals · Radmatic" };

const number = (value: number) => value.toLocaleString("en-IN");

export default async function ReferralsPage({ searchParams }: PageProps<"/referrals">) {
  const user = await requireUser();
  const params = readListParams(await searchParams, {
    sorts: ["created"],
    sort: "created",
    dir: "desc",
    filters: ["status"],
  });
  const mine = await loadMyReferrals(user, params);

  return (
    <Page>
      <PageHeader title="Referrals" description="Bring your colleagues to Radmatic, and be thanked with bonus AI updates." />

      <ReferralShare
        code={mine.code}
        rewards={PLANS.map((plan) => ({ plan: plan.name, updates: rewardFor(plan) }))}
        bonusDays={BONUS_DAYS}
      />

      <ReferralStats
        joined={mine.joined}
        paid={mine.paid}
        earned={mine.earned}
        bonusLeft={mine.bonus.remaining}
        bonusNote={mine.bonus.nextExpiry ? `First lapses ${formatDate(mine.bonus.nextExpiry)}` : "Used after your daily allowance"}
      />

      {mine.joined === 0 ? (
        <ReferralEmpty code={mine.code} />
      ) : (
        <PagedList
          path="/referrals"
          params={params}
          total={mine.page.total}
          placeholder="Search by account name"
          noun="referrals"
          single="referral"
          filters={
            <ListFilter
              path="/referrals"
              params={params}
              name="status"
              label="Status"
              options={[
                { value: "", text: "All referrals" },
                { value: "paid", text: "Paid" },
                { value: "waiting", text: "Not paid yet" },
              ]}
            />
          }
        >
          {mine.page.rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-line px-4 py-3.5 first:border-t-0 sm:px-6"
            >
              <IconTile tone={row.rewardedAt ? "teal" : "amber"}>
                <UserPlus weight="fill" className="h-5 w-5" />
              </IconTile>
              <span className="min-w-0 flex-1 basis-56">
                <span className="block truncate font-semibold">{row.name}</span>
                <Meta icon={<CalendarBlank weight="bold" />}>Joined {formatDate(row.joinedAt)}</Meta>
              </span>
              {row.rewardedAt ? (
                <>
                  <Badge tone="teal">Paid {row.plan ? row.plan.name : ""}</Badge>
                  <span className="min-w-36 text-right font-bold tabular-nums">
                    +{number(row.credits ?? 0)} updates
                  </span>
                </>
              ) : (
                <>
                  <Badge tone="amber">Not paid yet</Badge>
                  <span className="min-w-36 text-right font-semibold text-ink-soft">Nothing yet</span>
                </>
              )}
            </li>
          ))}
        </PagedList>
      )}
    </Page>
  );
}
