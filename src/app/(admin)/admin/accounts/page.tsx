import {
  Buildings,
  CalendarBlank,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { AccountInviteButton } from "@/components/admin/AccountInvite";
import { PlanControl } from "@/components/admin/PlanControl";
import { minutes } from "@/components/admin/parts";
import { ListFilter } from "@/components/app/ListControls";
import { PagedList } from "@/components/app/PagedList";
import { ConfirmAction } from "@/components/app/TeamClient";
import {
  Avatar,
  Badge,
  Chip,
  EmptyState,
  IconTile,
  LIST_HEAD,
  Meta,
  PANEL,
  Page,
  PageHeader,
  formatDate,
} from "@/components/app/ui";
import { accountTotals, listPendingInvites, pageAccounts } from "@/lib/admin";
import { requireStaff } from "@/lib/auth/session";
import { readListParams } from "@/lib/listQuery";
import { listPlanStatus } from "@/lib/subscription";
import type { Role } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/team";

// Live account data on every visit.
export const instant = false;

export const metadata = { title: "Accounts · LumenAI Admin" };

// Every row, and the headings above them, share these columns so values line up.
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_7.5rem_10rem_8.5rem_8.5rem_7rem_6.5rem] lg:items-center lg:gap-x-6";
const ROW = "flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4";

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

export default async function AdminAccountsPage({
  searchParams,
}: PageProps<"/admin/accounts">) {
  const user = await requireStaff();
  const params = readListParams(await searchParams, {
    sorts: ["created", "name"],
    sort: "created",
    dir: "desc",
    filters: ["kind"],
  });
  // Only the page of accounts asked for is read, with their people and plans.
  const [{ rows: accounts, total }, invites, totals] = await Promise.all([
    pageAccounts(params),
    listPendingInvites(),
    accountTotals(),
  ]);
  const plans = await listPlanStatus(accounts.map((account) => account.id));
  const people = totals.people;

  return (
    <Page>
      <PageHeader
        title="Accounts"
        description={`${totals.accounts} ${totals.accounts === 1 ? "account" : "accounts"}, ${people} ${
          people === 1 ? "person" : "people"
        }. Usage covers the last 30 days.`}
        action={<AccountInviteButton />}
      />

      {invites.length > 0 && (
        <section className={`${PANEL} p-6 sm:p-8`}>
          <h2 className="flex items-center gap-3 text-[1.08rem] font-semibold tracking-[-0.01em]">
            Invitations waiting
            <Badge tone="amber">{invites.length}</Badge>
          </h2>
          <ul className="mt-3">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line py-3.5 first:border-t-0"
              >
                <IconTile tone="amber">
                  <EnvelopeSimple weight="fill" className="h-5 w-5" />
                </IconTile>
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block truncate font-semibold">
                    {invite.email}
                  </span>
                  <span className="block truncate text-[0.9rem] text-ink-soft">
                    {invite.target}
                  </span>
                </span>
                <Meta icon={<CalendarBlank weight="bold" />}>
                  Expires {formatDate(invite.expiresAt)}
                </Meta>
              </li>
            ))}
          </ul>
        </section>
      )}

      {totals.accounts === 0 ? (
        <EmptyState
          icon={<Buildings weight="fill" className="h-5 w-5" />}
          title="No accounts yet"
          body="Open the first one with New account."
        />
      ) : (
        <PagedList
          path="/admin/accounts"
          params={params}
          total={total}
          placeholder="Search by account, name, email or phone"
          noun="accounts"
          filters={
            <ListFilter
              path="/admin/accounts"
              params={params}
              name="kind"
              label="Account type"
              options={[
                { value: "", text: "All accounts" },
                { value: "centre", text: "Centres" },
                { value: "solo", text: "Personal" },
              ]}
            />
          }
          head={
            <div aria-hidden="true" className={`${COLUMNS} ${LIST_HEAD}`}>
              <span>Account</span>
              <span>Type</span>
              <span>Plan</span>
              <span>Last sign-in</span>
              <span className="text-right">Report updates</span>
              <span className="text-right">Dictated</span>
              <span />
            </div>
          }
        >
          {accounts.map((account) => {
            // A personal account is its one person: one row, not a card around a row.
            const solo =
              account.kind !== "centre" && account.members.length === 1;
            return (
              <li
                key={account.id}
                className="border-t-2 border-line first:border-t-0"
              >
                {!solo && (
                  <div className={`${COLUMNS} ${ROW}`}>
                    <div className="flex min-w-0 items-center gap-4">
                      <IconTile tone="teal">
                        <Buildings weight="fill" className="h-5 w-5" />
                      </IconTile>
                      <span className="min-w-0">
                        <span className="block truncate text-[1.05rem] font-bold">
                          {account.name}
                        </span>
                        <span className="block truncate text-[0.9rem] text-ink-soft">
                          {account.members.length}{" "}
                          {account.members.length === 1 ? "person" : "people"},
                          opened {formatDate(account.createdAt)}
                        </span>
                      </span>
                    </div>
                    <Cell label="Type">
                      <Chip>
                        {account.kind === "centre" ? "Centre" : "Personal"}
                      </Chip>
                    </Cell>
                    <Cell label="Plan">
                      <PlanControl
                        orgId={account.id}
                        name={account.name}
                        status={plans.get(account.id) ?? null}
                      />
                    </Cell>
                    <span className="hidden lg:block" />
                    <Cell label="Report updates" number>
                      {account.updates30}
                    </Cell>
                    <Cell label="Dictated" number>
                      {minutes(account.seconds30)}
                    </Cell>
                    <span className="hidden lg:block" />
                  </div>
                )}
                {account.members.map((member) => (
                  <div
                    key={member.id}
                    className={`${COLUMNS} ${ROW} ${solo ? "" : "border-t border-line bg-ink/[0.025]"}`}
                  >
                    <div
                      className={`flex min-w-0 items-center gap-4 ${solo ? "" : "lg:pl-8"}`}
                    >
                      <Avatar name={member.name} />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          <span className="truncate">{member.name}</span>
                          {member.staff && (
                            <Badge tone="teal">LumenAI staff</Badge>
                          )}
                          {member.disabled && (
                            <Badge tone="amber">Turned off</Badge>
                          )}
                        </span>
                        <span className="block truncate text-[0.9rem] text-ink-soft">
                          {member.email}
                          {member.phone && <> · {member.phone}</>}
                        </span>
                      </span>
                    </div>
                    <Cell label="Type">
                      {solo ? (
                        <Chip>Personal</Chip>
                      ) : (
                        <Badge>{ROLE_LABELS[member.role as Role]}</Badge>
                      )}
                    </Cell>
                    {/* A centre's plan sits on its own row; a personal account's on its one person. */}
                    {solo ? (
                      <Cell label="Plan">
                        <PlanControl
                          orgId={account.id}
                          name={member.name}
                          status={plans.get(account.id) ?? null}
                        />
                      </Cell>
                    ) : (
                      <span className="hidden lg:block" />
                    )}
                    <Cell label="Last sign-in">
                      {member.lastLogin
                        ? formatDate(member.lastLogin)
                        : "Never"}
                    </Cell>
                    <Cell label="Report updates" number>
                      {member.updates30}
                    </Cell>
                    <Cell label="Dictated" number>
                      {minutes(member.seconds30)}
                    </Cell>
                    <span className="flex justify-end">
                      {member.id === user.id ? (
                        <span className="px-3 text-[0.9rem] font-semibold text-ink-soft">
                          You
                        </span>
                      ) : member.disabled ? (
                        <ConfirmAction
                          label="Turn on"
                          title={`Turn on ${member.name}?`}
                          body="They can sign in again with their existing password. Their reports and templates are untouched."
                          confirmLabel="Turn on"
                          doneMessage={`${member.name} can sign in again`}
                          tone="primary"
                          method="PATCH"
                          payload={{ disabled: false }}
                          path={`/api/admin/users/${member.id}`}
                        />
                      ) : (
                        <ConfirmAction
                          label="Turn off"
                          title={`Turn off ${member.name}?`}
                          body="They are signed out now and cannot sign in until you turn the account on again. Nothing is deleted."
                          confirmLabel="Turn off"
                          doneMessage={`${member.name} turned off and signed out`}
                          doneTone="warning"
                          method="PATCH"
                          payload={{ disabled: true }}
                          path={`/api/admin/users/${member.id}`}
                        />
                      )}
                    </span>
                  </div>
                ))}
              </li>
            );
          })}
        </PagedList>
      )}
    </Page>
  );
}
