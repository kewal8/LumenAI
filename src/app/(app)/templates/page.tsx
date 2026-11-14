import { Files, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AddSampleButton } from "@/components/app/AddSampleButton";
import { TemplateList } from "@/components/app/TemplateList";
import { EmptyState, Page, PageHeader, buttonClass } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { listTemplates } from "@/lib/templateStore";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Templates · LumenAI" };

export default async function TemplatesPage() {
  const user = await requireUser();
  const templates = await listTemplates(user);

  return (
    <Page>
      <PageHeader
        title="Templates"
        description="Your own report templates. Every report starts from one, with all lines normal."
        action={
          <Link href="/templates/new" className={buttonClass.primary}>
            <Plus weight="bold" className="h-4 w-4" />
            New template
          </Link>
        }
      />

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full">
            <EmptyState
              icon={<Files weight="fill" className="h-5 w-5" />}
              title="No templates yet"
              body="Paste one of your own templates, or add the sample CT Brain template to see how it works. Until then the Report screen uses the sample."
            />
          </div>
          <AddSampleButton />
        </div>
      ) : (
        <TemplateList templates={templates} />
      )}
    </Page>
  );
}
