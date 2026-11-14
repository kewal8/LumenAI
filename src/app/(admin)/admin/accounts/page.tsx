import {
  Buildings,
  CalendarBlank,
  EnvelopeSimple,
  FileText,
  Microphone,
  SignIn,
  User,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { AccountInviteButton } from "@/components/admin/AccountInvite";
import { minutes } from "@/components/admin/parts";
import { FilterList } from "@/components/app/Search";
import { ConfirmAction } from "@/components/app/TeamClient";
import {
  Avatar,
  Badge,
  Chip,
  EmptyState,
  IconTile,
  Meta,
  PANEL,
  Page,
  PageHeader,
  formatDate,
} from "@/components/app/ui";
import { listAccounts, listPendingInvites } from "@/lib/admin";
import { requireUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/team";

// Live account data on every visit.
export const instant = false;

export const metadata = { title: "Accounts · LumenAI Admin" };

export default async function AdminAccountsPage() {
  const [user, accounts, invites] = await Promise.all([requireUser(), listAccounts(), listPendingInvites()]);
  const people = accounts.reduce((sum, account) => sum + account.members.length, 0);

  return (
    <Page>
      <PageHeader
        title="Accounts"
        description={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}, ${people} ${
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
                  <span className="block truncate font-semibold">{invite.email}</span>
                  <span className="block truncate text-[0.9rem] text-ink-soft">{invite.target}</span>
                </span>
                <Meta icon={<CalendarBlank weight="bold" />}>Expires {formatDate(invite.expiresAt)}</Meta>
              </li>
            ))}
          </ul>
        </section>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Buildings weight="fill" className="h-5 w-5" />}
          title="No accounts yet"
          body="Open the first one with New account."
        />
      ) : (
        <FilterList
          placeholder="Search by account, name or email"
          noun="accounts"
          listClassName="flex flex-col gap-4"
          items={accounts.map((account) => ({
            key: account.id,
            text: [
              account.name,
              account.kind === "centre" ? "centre" : "personal",
              ...account.members.flatMap((member) => [member.name, member.email, member.role]),
            ].join(" "),
            node: (
              <li key={account.id} className={`${PANEL} overflow-hidden`}>
                <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5">
                  <IconTile tone={account.kind === "centre" ? "teal" : "neutral"}>
                    {account.kind === "centre" ? (
                      <Buildings weight="fill" className="h-5 w-5" />
                    ) : (
                      <User weight="fill" className="h-5 w-5" />
                    )}
                  </IconTile>
                  <div className="min-w-0 flex-1 basis-64">
                    <h2 className="flex flex-wrap items-center gap-2 text-[1.1rem] font-semibold">
                      {account.name}
                      <Chip>{account.kind === "centre" ? "Centre" : "Personal"}</Chip>
                    </h2>
                    <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                      <Meta icon={<CalendarBlank weight="bold" />}>Opened {formatDate(account.createdAt)}</Meta>
                      <Meta icon={<UsersThree weight="bold" />}>
                        {account.members.length} {account.members.length === 1 ? "person" : "people"}
                      </Meta>
                    </p>
                  </div>
                  <dl className="flex gap-8">
                    <div>
                      <dt className="flex items-center gap-1.5 text-[0.85rem] font-semibold text-ink-soft">
                        <FileText weight="bold" className="h-4 w-4" />
                        Report updates
                      </dt>
                      <dd className="text-[1.5rem] font-bold tabular-nums tracking-[-0.02em]">{account.updates30}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-[0.85rem] font-semibold text-ink-soft">
                        <Microphone weight="bold" className="h-4 w-4" />
                        Dictated
                      </dt>
                      <dd className="text-[1.5rem] font-bold tabular-nums tracking-[-0.02em]">
                        {minutes(account.seconds30)}
                      </dd>
                    </div>
                  </dl>
                </header>
                <ul>
                  {account.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-6 py-3.5"
                    >
                      <Avatar name={member.name} />
                      <span className="min-w-0 flex-1 basis-56">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          {member.name}
                          {member.staff && <Badge tone="teal">LumenAI staff</Badge>}
                          {member.disabled && <Badge tone="amber">Turned off</Badge>}
                        </span>
                        <span className="block truncate text-[0.9rem] text-ink-soft">{member.email}</span>
                      </span>
                      <span className="w-28">
                        <Badge>{ROLE_LABELS[member.role as Role]}</Badge>
                      </span>
                      <span className="w-52">
                        <Meta icon={<SignIn weight="bold" />}>
                          {member.lastLogin ? `Signed in ${formatDate(member.lastLogin)}` : "Never signed in"}
                        </Meta>
                      </span>
                      <span className="flex w-28 justify-end">
                        {member.id === user.id ? (
                          <span className="text-[0.9rem] font-semibold text-ink-soft">You</span>
                        ) : member.disabled ? (
                          <ConfirmAction
                            label="Turn on"
                            title={`Turn on ${member.name}?`}
                            body="They can sign in again with their existing password. Their reports and templates are untouched."
                            confirmLabel="Turn on"
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
                            method="PATCH"
                            payload={{ disabled: true }}
                            path={`/api/admin/users/${member.id}`}
                          />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ),
          }))}
        />
      )}
    </Page>
  );
}
