import { ChatCircleText } from "@phosphor-icons/react/dist/ssr";
import { FeedbackList } from "@/components/admin/FeedbackList";
import { EmptyState, Page, PageHeader } from "@/components/app/ui";
import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { FeedbackRow } from "@/lib/feedback";
import { likePattern, offsetOf, readListParams } from "@/lib/listQuery";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Feedback · LumenAI Admin" };

export default async function FeedbackPage({ searchParams }: PageProps<"/admin/feedback">) {
  await requireStaff();
  const params = readListParams(await searchParams, { sorts: ["created"], sort: "created", dir: "desc" });
  const like = likePattern(params.q);

  // Only the page asked for is read; the count of everything is its own small query.
  const [found, [counts]] = await Promise.all([
    db()`
      select id, message, sender_name, sender_email, org_name, page, created_at, count(*) over () as total
      from feedback
      where (${params.q} = '' or message ilike ${like} or sender_name ilike ${like}
             or sender_email ilike ${like} or coalesce(org_name, '') ilike ${like})
      order by
        case when ${params.dir} = 'asc' then created_at end asc,
        case when ${params.dir} = 'desc' then created_at end desc,
        id
      limit ${params.size} offset ${offsetOf(params)}
    `,
    db()`select count(*)::int as all from feedback`,
  ]);
  const all = counts?.all ?? 0;
  const rows: FeedbackRow[] = found.map((row) => ({
    id: row.id,
    message: row.message,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    orgName: row.org_name,
    page: row.page,
    createdAt: new Date(row.created_at).toISOString(),
  }));

  return (
    <Page>
      <PageHeader
        title="Feedback"
        description={
          all > 0
            ? `${all} ${all === 1 ? "message" : "messages"} sent from inside the app, newest first.`
            : "Messages doctors send from the Send feedback button."
        }
      />

      {all === 0 ? (
        <EmptyState
          icon={<ChatCircleText weight="fill" className="h-5 w-5" />}
          title="No feedback yet"
          body="When someone presses Send feedback on the new-report screen, their message appears here."
        />
      ) : (
        <FeedbackList rows={rows} total={Number(found[0]?.total ?? 0)} params={params} />
      )}
    </Page>
  );
}
