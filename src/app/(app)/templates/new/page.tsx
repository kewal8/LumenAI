import { TemplateEditor } from "@/components/app/TemplateEditor";
import { Page } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/team";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "New template · LumenAI" };

export default async function NewTemplatePage() {
  const user = await requireUser();
  return (
    <Page narrow>
      <TemplateEditor canShare={canManageTeam(user.org?.role)} />
    </Page>
  );
}
