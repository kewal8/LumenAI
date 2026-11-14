import { ReportWorkspace } from "@/components/report/ReportWorkspace";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Report · LumenAI" };

export default async function ReportPage() {
  const user = await requireUser();
  const [row] = await db()`select paste_profile from users where id = ${user.id}`;
  return <ReportWorkspace profile={parsePasteProfile(row?.paste_profile)} />;
}
