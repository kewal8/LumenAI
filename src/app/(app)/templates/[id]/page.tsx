import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/app/TemplateEditor";
import { Page } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/team";
import { findTemplate } from "@/lib/templateStore";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Edit template · LumenAI" };

export default async function EditTemplatePage({ params }: PageProps<"/templates/[id]">) {
  const user = await requireUser();
  const template = await findTemplate(user, (await params).id);
  if (!template?.canEdit) notFound();

  return (
    <Page narrow>
      <TemplateEditor
        template={{
          id: template.id,
          shared: template.shared,
          name: template.name,
          title: template.title,
          sections: template.sections,
          normalImpression: template.normalImpression,
        }}
        canShare={canManageTeam(user.org?.role)}
      />
    </Page>
  );
}
