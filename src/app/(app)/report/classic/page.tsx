import { ReportWorkspace } from "@/components/report/ReportWorkspace";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { editorLocked } from "@/lib/subscription";
import { loadWorkspace } from "@/lib/workspace";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "New report, version one · LumenAI" };

// Version one of the report screen, kept as a backup beside the new design.
// Same reports, templates and settings; only the layout differs.
export default async function ClassicReportPage({ searchParams }: PageProps<"/report/classic">) {
  const user = await requireUser();
  if (await editorLocked(user)) redirect("/plans");
  const { template } = await searchParams;
  const workspace = await loadWorkspace(user, typeof template === "string" ? template : null);

  return <ReportWorkspace key={workspace.templates[0].id} {...workspace} design="classic" />;
}
