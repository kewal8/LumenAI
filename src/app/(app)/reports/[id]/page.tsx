import { notFound } from "next/navigation";
import { ReportWorkspace } from "@/components/report/ReportWorkspace";
import { requireUser } from "@/lib/auth/session";
import { findReport } from "@/lib/reportStore";
import { loadWorkspace } from "@/lib/workspace";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Report · LumenAI" };

export default async function SavedReportPage({ params }: PageProps<"/reports/[id]">) {
  const user = await requireUser();
  const [saved, { profile, templates }] = await Promise.all([
    findReport(user, (await params).id),
    loadWorkspace(user),
  ]);
  if (!saved) notFound();

  // The report keeps the template it was written with, even if that template
  // has since been changed or deleted.
  const others = templates.filter((template) => template.id !== saved.template.id);
  return (
    <ReportWorkspace
      key={saved.id}
      profile={profile}
      templates={[saved.template, ...others]}
      saved={saved}
    />
  );
}
