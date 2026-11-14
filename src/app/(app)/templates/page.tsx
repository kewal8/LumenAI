import { Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AddSampleButton } from "@/components/app/AddSampleButton";
import { Badge, EmptyState, PANEL, Page, PageHeader, buttonClass } from "@/components/app/ui";
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
              title="No templates yet"
              body="Paste one of your own templates, or add the sample CT Brain template to see how it works. Until then the Report screen uses the sample."
            />
          </div>
          <AddSampleButton />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const lines = template.sections.reduce((total, section) => total + section.lines.length, 0);
            return (
              <li key={template.id} className={`${PANEL} flex flex-col gap-4 p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[1.15rem] font-semibold tracking-[-0.02em]">
                      {template.name}
                    </h2>
                    <p className="truncate text-[0.9rem] text-ink-soft">{template.title}</p>
                  </div>
                  {template.shared && <Badge tone="teal">Shared</Badge>}
                </div>
                <p className="text-[0.9rem] text-ink-soft">
                  {template.sections.map((section) => section.heading).join(", ")}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-[0.85rem] text-ink-quiet">
                    {lines} {lines === 1 ? "line" : "lines"}
                    {!template.mine && `, by ${template.ownerName}`}
                  </p>
                  {template.canEdit && (
                    <Link href={`/templates/${template.id}`} className={buttonClass.secondary}>
                      Edit
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
