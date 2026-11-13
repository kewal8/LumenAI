import { notFound } from "next/navigation";
import { DemoStatusSelect } from "@/components/app/DemoStatusSelect";
import { Badge, EmptyState, PANEL, Page, PageHeader, formatDate } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { DemoStatus } from "@/lib/demo";

export const metadata = { title: "Demo requests · LumenAI" };

export default async function DemoRequestsPage() {
  const user = await requireUser();
  if (!user.isPlatformAdmin) notFound();

  const requests = await db()`
    select id, created_at, status, name, email, phone, designation, organisation,
           organisation_type, location, message
    from demo_requests
    order by (status = 'new') desc, created_at desc
    limit 200
  `;
  const waiting = requests.filter((request) => request.status === "new").length;

  return (
    <Page>
      <PageHeader
        title="Demo requests"
        description={
          waiting > 0
            ? `${waiting} waiting for a reply.`
            : "Requests sent from the Book a demo page."
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          body="When someone fills in the Book a demo form, their details appear here."
        />
      ) : (
        <ul className={`${PANEL} overflow-hidden`}>
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line px-6 py-5 first:border-t-0"
            >
              <div className="min-w-0 flex-1 basis-72">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {request.name}
                  {request.status === "new" && <Badge tone="amber">New</Badge>}
                </p>
                <p className="text-[0.9rem] text-ink-soft">
                  {[request.designation, request.organisation, request.organisation_type, request.location]
                    .filter(Boolean)
                    .join(", ") || "No organisation given"}
                </p>
                {request.message && (
                  <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[0.95rem]">{request.message}</p>
                )}
              </div>
              <div className="w-56 text-[0.9rem]">
                <a href={`mailto:${request.email}`} className="block truncate font-semibold text-teal-deep hover:underline">
                  {request.email}
                </a>
                <a href={`tel:${request.phone.replace(/[^+\d]/g, "")}`} className="block text-ink-soft hover:underline">
                  {request.phone}
                </a>
                <p className="mt-1 text-ink-quiet">{formatDate(request.created_at)}</p>
              </div>
              <DemoStatusSelect id={request.id} status={request.status as DemoStatus} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
