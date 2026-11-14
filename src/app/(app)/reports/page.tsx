import { FolderOpen, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { ReportList } from "@/components/app/ReportList";
import { EmptyState, Page, PageHeader, buttonClass } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { listReports } from "@/lib/reportStore";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Reports · LumenAI" };

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await listReports(user);

  return (
    <Page>
      <PageHeader
        title="Reports"
        description="Reports you saved, newest first. Open one to read, change or copy it again."
        action={
          <Link href="/report" className={buttonClass.primary}>
            <Plus weight="bold" className="h-4 w-4" />
            New report
          </Link>
        }
      />
      {reports.length === 0 ? (
        <EmptyState
          icon={<FolderOpen weight="fill" className="h-5 w-5" />}
          title="No saved reports yet"
          body="Write a report, then press Save. It will be kept here with its date and time."
        />
      ) : (
        <ReportList reports={reports} />
      )}
    </Page>
  );
}
