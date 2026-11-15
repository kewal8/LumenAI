import { DemoStatusSelect } from "@/components/app/DemoStatusSelect";
import { FilterList } from "@/components/app/Search";
import {
  CalendarBlank,
  CalendarCheck,
  EnvelopeSimple,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import {
  Avatar,
  Badge,
  EmptyState,
  Meta,
  LIST_HEAD,
  PANEL,
  Page,
  PageHeader,
  formatDate,
} from "@/components/app/ui";
import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { DemoStatus } from "@/lib/demo";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Demo requests · LumenAI Admin" };

export default async function DemoRequestsPage() {
  await requireStaff();

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
          icon={<CalendarCheck weight="fill" className="h-5 w-5" />}
          title="No requests yet"
          body="When someone fills in the Book a demo form, their details appear here."
        />
      ) : (
        <FilterList
          placeholder="Search by name, organisation or contact"
          noun="requests"
          listClassName={`${PANEL} overflow-hidden`}
          head={
            <div aria-hidden="true" className={`${LIST_HEAD} gap-x-6 lg:flex`}>
              <span className="flex-1">Request</span>
              <span className="w-64">Contact</span>
              <span className="w-40">Status</span>
            </div>
          }
          items={requests.map((request) => ({
            key: request.id as string,
            text: [
              request.name,
              request.email,
              request.phone,
              request.designation,
              request.organisation,
              request.organisation_type,
              request.location,
              request.message,
              request.status,
            ]
              .filter(Boolean)
              .join(" "),
            node: (
              <li
                key={request.id}
                className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line px-6 py-5 first:border-t-0"
              >
                <Avatar name={request.name as string} />
                <div className="min-w-0 flex-1 basis-72">
                  <p className="flex flex-wrap items-center gap-2 text-[1.05rem] font-semibold">
                    {request.name}
                    {request.status === "new" && (
                      <Badge tone="amber">New</Badge>
                    )}
                  </p>
                  <p className="text-[0.9rem] text-ink-soft">
                    {[
                      request.designation,
                      request.organisation,
                      request.organisation_type,
                      request.location,
                    ]
                      .filter(Boolean)
                      .join(", ") || "No organisation given"}
                  </p>
                  {request.message && (
                    <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[0.95rem]">
                      {request.message}
                    </p>
                  )}
                </div>
                <div className="flex w-64 flex-col gap-1.5">
                  <a
                    href={`mailto:${request.email}`}
                    className="truncate hover:underline"
                  >
                    <Meta icon={<EnvelopeSimple weight="bold" />}>
                      {request.email}
                    </Meta>
                  </a>
                  <a
                    href={`tel:${request.phone.replace(/[^+\d]/g, "")}`}
                    className="hover:underline"
                  >
                    <Meta icon={<Phone weight="bold" />}>{request.phone}</Meta>
                  </a>
                  <Meta icon={<CalendarBlank weight="bold" />}>
                    {formatDate(request.created_at)}
                  </Meta>
                </div>
                <span className="w-40">
                  <DemoStatusSelect
                    id={request.id}
                    status={request.status as DemoStatus}
                  />
                </span>
              </li>
            ),
          }))}
        />
      )}
    </Page>
  );
}
