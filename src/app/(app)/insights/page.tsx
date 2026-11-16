import { ChartLineUp, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { UsageActivity } from "@/components/app/UsageActivity";
import { WorkInsights } from "@/components/app/WorkInsights";
import { Page, PageHeader, Section } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { loadInsights } from "@/lib/insights";
import { loadUsageActivity } from "@/lib/usageActivity";

// Live counts on every visit.
export const instant = false;

export const metadata = { title: "Insights · LumenAI" };

export default async function InsightsPage() {
  const user = await requireUser();
  const [insights, activity] = await Promise.all([loadInsights(user), loadUsageActivity(user)]);

  return (
    <Page>
      <PageHeader title="Insights" description="Your reporting over the last 30 days. Only your own reports are counted." />
      <Section
        title="Your work"
        description="Reports you finalized, how long they took, and what you read."
        icon={<ChartLineUp weight="fill" className="h-5 w-5" />}
      >
        <WorkInsights insights={insights} />
      </Section>
      <Section
        title="AI updates"
        description="What your plan allows each day, and how it has been used. One update is one change to a report from your dictation, or one Validate."
        icon={<Sparkle weight="fill" className="h-5 w-5" />}
      >
        <UsageActivity activity={activity} />
      </Section>
    </Page>
  );
}
