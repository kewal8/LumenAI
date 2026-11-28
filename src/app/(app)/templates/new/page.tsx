import { TemplateCanvas } from "@/components/app/TemplateCanvas";
import { Page } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/team";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "New template · Radmatic" };

export default async function NewTemplatePage() {
  const user = await requireUser();
  return (
    <Page>
      <TemplateCanvas
        canShare={canManageTeam(user.org?.role)}
        orgName={user.org?.name ?? "your organisation"}
      />
    </Page>
  );
}
