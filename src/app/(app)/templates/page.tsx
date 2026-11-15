import { Files, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { TemplateList } from "@/components/app/TemplateList";
import { EmptyState, Page, PageHeader, buttonClass } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { readListParams } from "@/lib/listQuery";
import { TEMPLATE_SORTS, pageTemplates, templateFacets } from "@/lib/templateStore";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Templates · LumenAI" };

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  const user = await requireUser();
  const params = readListParams(await searchParams, {
    sorts: TEMPLATE_SORTS,
    sort: "name",
    dir: "asc",
    filters: ["owner", "modality"],
  });
  // Only the page asked for is read, never the whole list.
  const [{ rows, total }, facets] = await Promise.all([pageTemplates(user, params), templateFacets(user)]);

  return (
    <Page>
      <PageHeader
        title="Templates"
        description="Every report starts from a template, with all its lines normal."
        action={
          <Link href="/templates/new" className={buttonClass.primary}>
            <Plus weight="bold" className="h-4 w-4" />
            New template
          </Link>
        }
      />

      {!facets.any ? (
        <EmptyState
          icon={<Files weight="fill" className="h-5 w-5" />}
          title="No templates yet"
          body="Press New template, then write or paste one of your own."
        />
      ) : (
        <TemplateList rows={rows} total={total} params={params} />
      )}
    </Page>
  );
}
