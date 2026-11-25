import { Sparkle } from "@phosphor-icons/react/dist/ssr";
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
      <WorkInsights insights={insights} />
      <Section
        title="AI updates"
        description="How your plan's AI updates are used. One update is one change from your dictation, or one Validate."
        icon={<Sparkle weight="fill" className="h-5 w-5 text-amber-deep" />}
      >
        <UsageActivity activity={activity} />
      </Section>
    </Page>
  );
}
