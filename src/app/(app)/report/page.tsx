import { ReportWorkspace } from "@/components/report/ReportWorkspace";
import { requireUser } from "@/lib/auth/session";
import { loadWorkspace } from "@/lib/workspace";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "New report · LumenAI" };

export default async function NewReportPage({ searchParams }: PageProps<"/report">) {
  const user = await requireUser();
  const { template } = await searchParams;
  const { profile, shortcuts, templates, identity } = await loadWorkspace(user, typeof template === "string" ? template : null);

  // Keyed by the starting template so choosing another one starts a clean report.
  return <ReportWorkspace key={templates[0].id} profile={profile} identity={identity} shortcuts={shortcuts} templates={templates} />;
}
