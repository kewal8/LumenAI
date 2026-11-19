import { ReportWorkspace } from "@/components/report/ReportWorkspace";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { editorLocked } from "@/lib/subscription";
import { loadWorkspace } from "@/lib/workspace";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "New report · LumenAI" };

export default async function NewReportPage({ searchParams }: PageProps<"/report">) {
  const user = await requireUser();
  // The plan check and the screen's data are read together: one wait, not two.
  const [locked, workspace] = await Promise.all([
    editorLocked(user),
    searchParams.then(({ template }) => loadWorkspace(user, typeof template === "string" ? template : null)),
  ]);
  // No active plan: the Plans page explains why and opens the way in.
  if (locked) redirect("/plans");

  // Keyed by the starting template so choosing another one starts a clean report.
  return <ReportWorkspace key={workspace.template.id} {...workspace} design="future" />;
}
