import { LinkSimple } from "@phosphor-icons/react/dist/ssr";
import { PreviewLinkButton } from "@/components/admin/PreviewLink";
import { PagedList } from "@/components/app/PagedList";
import { ConfirmAction } from "@/components/app/TeamClient";
import {
  Badge,
  EmptyState,
  IconTile,
  LIST_HEAD,
  Page,
  PageHeader,
  formatDate,
  formatDateTime,
} from "@/components/app/ui";
import { requireStaff } from "@/lib/auth/session";
import { readListParams } from "@/lib/listQuery";
import { pagePreviewLinks, type PreviewLink } from "@/lib/previewLinks";

// Live link data on every visit.
export const instant = false;

export const metadata = { title: "Preview links · LumenAI Admin" };

// Every row, and the headings above them, share these columns so values line up.
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_7rem_9rem_6rem_11rem_6.5rem] lg:items-center lg:gap-x-6";

const STATES: Record<
  PreviewLink["state"],
  { label: string; tone: "teal" | "amber" | "neutral" }
> = {
  active: { label: "Active", tone: "teal" },
  expired: { label: "Expired", tone: "neutral" },
  off: { label: "Turned off", tone: "amber" },
};

/** One value in a row. Below the table layout it carries its own label. */
function Cell({
  label,
  number,
  children,
}: {
  label: string;
  number?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex flex-col gap-0.5 text-[0.95rem] font-semibold ${
        number
          ? "tabular-nums lg:items-end lg:text-[1.05rem] lg:font-bold"
          : "items-start"
      }`}
    >
      <span className="text-[0.8rem] font-semibold text-ink-soft lg:hidden">
        {label}
      </span>
      {children}
    </span>
  );
}

export default async function AdminPreviewLinksPage({
  searchParams,
}: PageProps<"/admin/preview-links">) {
  await requireStaff();
  const params = readListParams(await searchParams, {
    sorts: ["created"],
    sort: "created",
    dir: "desc",
  });
  // Only the page asked for is read.
  const { rows: links, total, active, all } = await pagePreviewLinks(params);

  return (
    <Page>
      <PageHeader
        title="Preview links"
        description={`Links that open the new report editor without an account. ${active} active.`}
        action={<PreviewLinkButton />}
      />

      {all === 0 ? (
        <EmptyState
          icon={<LinkSimple weight="bold" className="h-5 w-5" />}
          title="No preview links yet"
          body="Make one with New link and send it to the person who should try the editor."
        />
      ) : (
        <PagedList
          path="/admin/preview-links"
          params={params}
          total={total}
          placeholder="Search by name"
          noun="links"
          head={
            <div aria-hidden="true" className={`${COLUMNS} ${LIST_HEAD}`}>
              <span>For</span>
              <span>Status</span>
              <span>Works until</span>
              <span className="text-right">Opened</span>
              <span>Last opened</span>
              <span />
            </div>
          }
        >
          {links.map((link) => (
            <li
              key={link.id}
              className={`${COLUMNS} flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line px-6 py-4 first:border-t-0`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <IconTile tone={link.state === "active" ? "teal" : "neutral"}>
                  <LinkSimple weight="bold" className="h-5 w-5" />
                </IconTile>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {link.label}
                  </span>
                  <span className="block truncate text-[0.9rem] text-ink-soft">
                    Made {formatDate(link.createdAt)}
                  </span>
                </span>
              </div>
              <Cell label="Status">
                <Badge tone={STATES[link.state].tone}>
                  {STATES[link.state].label}
                </Badge>
              </Cell>
              <Cell label="Works until">{formatDate(link.expiresAt)}</Cell>
              <Cell label="Opened" number>
                {link.opens}
              </Cell>
              <Cell label="Last opened">
                {link.lastOpenedAt
                  ? formatDateTime(link.lastOpenedAt)
                  : "Never"}
              </Cell>
              <span className="flex justify-end">
                {link.state === "active" && (
                  <ConfirmAction
                    label="Turn off"
                    title={`Turn off the link for ${link.label}?`}
                    body="The link stops working at once and cannot be turned back on. You can make a new one."
                    confirmLabel="Turn off"
                    doneMessage={`Link for ${link.label} turned off`}
                    doneTone="warning"
                    method="PATCH"
                    path={`/api/admin/preview-links/${link.id}`}
                  />
                )}
              </span>
            </li>
          ))}
        </PagedList>
      )}
    </Page>
  );
}
