import { CalendarBlank, Gift, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { StatTile, compact } from "@/components/admin/parts";
import { ListFilter } from "@/components/app/ListControls";
import { PagedList } from "@/components/app/PagedList";
import { ReferralShare } from "@/components/app/Referrals";
import { Badge, EmptyState, IconTile, Meta, Page, PageHeader, Section, formatDate } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { readListParams } from "@/lib/listQuery";
import { PLANS } from "@/lib/plans";
import { BONUS_DAYS, loadMyReferrals, rewardFor } from "@/lib/referrals";

// Live counts on every visit.
export const instant = false;

export const metadata = { title: "Referrals · LumenAI" };

const number = (value: number) => value.toLocaleString("en-IN");

// What a referral is worth on each plan, in one sentence.
const REWARD = `When someone signs up with your code and pays for their first plan, your account gets half a month of their plan's AI updates: ${PLANS.map(
  (plan) => `${number(rewardFor(plan))} for ${plan.name}`,
).join(", ")}. Bonus updates are used only after your daily allowance runs out, and last ${BONUS_DAYS} days.`;

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
      <PageHeader
        title="Referrals"
        description="Share your code with colleagues. You are thanked with bonus AI updates when they pay, not when they sign up."
      />

      <Section
        title="Your code"
        description="Made from your name. Give it to a colleague, or send them the sign-up link."
        icon={<Gift weight="fill" className="h-5 w-5" />}
      >
        <ReferralShare code={mine.code} reward={REWARD} />
      </Section>

      <section aria-label="Your referrals in numbers" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Signed up"
          figure={{ main: number(mine.joined) }}
          detail={mine.joined === 1 ? "account used your code" : "accounts used your code"}
        />
        <StatTile
          title="Paid"
          figure={{ main: number(mine.paid) }}
          detail={mine.joined > mine.paid ? `${mine.joined - mine.paid} not paid yet` : "Every one has paid"}
        />
        <StatTile
          title="AI updates earned"
          figure={{ main: compact(mine.earned) }}
          detail="From every paid referral so far"
        />
        <StatTile
          title="Bonus left"
          figure={{ main: number(mine.bonus.remaining) }}
          detail={
            mine.bonus.nextExpiry
              ? `Soonest lapse ${formatDate(mine.bonus.nextExpiry)}`
              : "Used after your daily allowance"
          }
        />
      </section>

      {mine.joined === 0 ? (
        <EmptyState
          icon={<UserPlus weight="fill" className="h-5 w-5" />}
          title="No one has used your code yet"
          body="When a colleague signs up or pays with it, they appear here."
        />
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
