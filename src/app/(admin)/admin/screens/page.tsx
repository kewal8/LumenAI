import { ScreensPreview } from "@/components/admin/ScreensPreview";
import { Page, PageHeader } from "@/components/app/ui";
import { requireStaff } from "@/lib/auth/session";

// Checks the staff session on every visit.
export const instant = false;

export const metadata = { title: "Screens · Radmatic Admin" };

// Every full screen a customer is greeted with, as they see it, and when.
export default async function ScreensPage() {
  await requireStaff();

  return (
    <Page>
      <PageHeader
        title="Screens"
        description="The moments a customer is greeted, how each one looks, and when it shows."
      />
      <ScreensPreview />
    </Page>
  );
}
