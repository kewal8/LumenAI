import { notFound, redirect } from "next/navigation";
import { ReportWorkspace } from "@/components/report/ReportWorkspace";
import { requireUser } from "@/lib/auth/session";
import { editorLocked } from "@/lib/subscription";
import { findReport } from "@/lib/reportStore";
import { loadWorkspace } from "@/lib/workspace";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Report · Radmatic" };

export default async function SavedReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  const user = await requireUser();
  if (await editorLocked(user)) redirect("/plans");
  const [saved, workspace, { design }] = await Promise.all([
    findReport(user, (await params).id),
    loadWorkspace(user),
    searchParams,
  ]);
  if (!saved) notFound();

  // The report keeps the template it was written with, even if that template
  // has since been changed or deleted.
  return (
    <ReportWorkspace
      key={saved.id}
      {...workspace}
      template={saved.template}
      saved={saved}
      // ?design=classic reopens it in version one of the report screen.
      design={design === "classic" ? "classic" : "future"}
    />
  );
}
