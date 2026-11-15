import { notFound } from "next/navigation";
import { TemplateCanvas } from "@/components/app/TemplateCanvas";
import { Page } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import type { DocNode } from "@/lib/reportDoc";
import { canManageTeam } from "@/lib/team";
import { draftToDoc } from "@/lib/templateDoc";
import { findTemplate } from "@/lib/templateStore";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Edit template · LumenAI" };

export default async function EditTemplatePage({ params }: PageProps<"/templates/[id]">) {
  const user = await requireUser();
  const template = await findTemplate(user, (await params).id);
  if (!template?.canEdit) notFound();

  return (
    <Page>
      <TemplateCanvas
        key={template.updatedAt}
        template={{
          id: template.id,
          name: template.name,
          modality: template.modality,
          shared: template.shared,
          // Templates saved before the open editor are laid out from their sections.
          doc: (template.doc as DocNode | null) ?? draftToDoc(template),
        }}
        canShare={canManageTeam(user.org?.role)}
      />
    </Page>
  );
}
