import { PagedList } from "@/components/app/PagedList";
import {
  HeadTick,
  ListMenu,
  RowTick,
  Selectable,
  SelectionBar,
} from "@/components/app/Selection";
import {
  ConfirmAction,
  InviteButton,
  RoleSelect,
} from "@/components/app/TeamClient";
import {
  Clock,
  EnvelopeSimple,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import {
  Avatar,
  Badge,
  EmptyState,
  IconTile,
  Meta,
  LIST_HEAD,
  PANEL,
  Page,
  PageHeader,
  formatDate,
} from "@/components/app/ui";
import { requireUser, type Role } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { likePattern, offsetOf, readListParams } from "@/lib/listQuery";
import {
  ROLE_LABELS,
  assignableRoles,
  canManageMember,
  canManageTeam,
} from "@/lib/team";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Team · LumenAI" };

export default async function TeamPage({ searchParams }: PageProps<"/team">) {
  const user = await requireUser();
  if (!user.org) {
    return (
      <Page>
        <PageHeader title="Team" />
        <EmptyState
          icon={<UsersThree weight="fill" className="h-5 w-5" />}
          title="No organisation"
          body="Your account is not part of an organisation yet. Ask LumenAI to set one up."
        />
      </Page>
    );
  }

  const params = readListParams(await searchParams, {
    sorts: ["role"],
    sort: "role",
    dir: "asc",
  });
  const like = likePattern(params.q);
  const sql = db();
  // Only the page of people asked for is read.
  const [members, invites] = await Promise.all([
    sql`
      select u.id, u.name, u.email, u.last_login_at, m.role, count(*) over () as total
      from memberships m join users u on u.id = m.user_id
      where m.org_id = ${user.org.id}
        and (${params.q} = '' or u.name ilike ${like} or u.email ilike ${like} or m.role ilike ${like})
      order by array_position(array['owner', 'admin', 'radiologist'], m.role), u.name, u.id
      limit ${params.size} offset ${offsetOf(params)}
    `,
    sql`
      select id, email, role, expires_at from invites
      where org_id = ${user.org.id} and accepted_at is null and expires_at > now()
      order by created_at desc
      limit 20
    `,
  ]);

  const actor = { id: user.id, role: user.org.role };
  const roles = assignableRoles(user.org.role);
  const manages = canManageTeam(user.org.role);
  // People on this page whom the signed-in person may remove.
  const removable = members
    .filter((member) =>
      canManageMember(actor, {
        id: member.id as string,
        role: member.role as Role,
      }),
    )
    .map((member) => member.id as string);

  return (
    <Page>
      <PageHeader
        title="Team"
        description={`People who report under ${user.org.name}.`}
        action={manages ? <InviteButton roles={roles} /> : undefined}
      />

      <section aria-label="Members">
        <Selectable>
          <PagedList
            path="/team"
            params={params}
            total={Number(members[0]?.total ?? 0)}
            placeholder="Search people"
            noun="people"
            single="person"
            filters={removable.length > 0 ? <ListMenu /> : undefined}
            bar={
              <SelectionBar
                noun="people"
                single="person"
                deleteBase="/api/team/members/"
                warning="Their accounts are deleted and they are signed out everywhere. You can invite them again later."
              />
            }
            head={
              <div className={`${LIST_HEAD} gap-x-4 lg:flex`}>
                <span className="flex flex-1 items-center gap-3">
                  <HeadTick ids={removable} />
                  Person
                </span>
                <span className="w-52">Last sign-in</span>
                <span className="w-56 text-right">Role</span>
              </div>
            }
          >
            {members.map((member) => {
              const target = {
                id: member.id as string,
                role: member.role as Role,
              };
              const manageable = canManageMember(actor, target);
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line px-6 py-4 first:border-t-0"
                >
                  {manageable && (
                    <RowTick id={target.id} label={member.name as string} />
                  )}
                  <Avatar name={member.name as string} />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex items-center gap-2 text-[1.05rem] font-semibold">
                      <span className="truncate">{member.name}</span>
                      {member.id === user.id && <Badge>You</Badge>}
                    </p>
                    <p className="truncate text-[0.9rem] text-ink-soft">
                      {member.email}
                    </p>
                  </div>
                  <span className="w-52 text-[0.95rem] font-semibold">
                    <span className="mr-1.5 text-ink-soft lg:hidden">
                      Last sign-in
                    </span>
                    {formatDate(member.last_login_at)}
                  </span>
                  <div className="flex w-56 items-center justify-end gap-1">
                    {manageable ? (
                      <>
                        <RoleSelect
                          memberId={target.id}
                          memberName={member.name as string}
                          role={target.role}
                          roles={roles}
                        />
                        <ConfirmAction
                          label="Remove"
                          title={`Remove ${member.name}?`}
                          body="Their account is deleted and they are signed out everywhere. You can invite them again later."
                          confirmLabel="Remove"
                          doneMessage={`${member.name} removed from the team`}
                          path={`/api/team/members/${target.id}`}
                        />
                      </>
                    ) : (
                      <Badge
                        tone={target.role === "owner" ? "teal" : "neutral"}
                      >
                        {ROLE_LABELS[target.role]}
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </PagedList>
        </Selectable>
      </section>

      {manages && (
        <section
          aria-labelledby="pending-title"
          className="flex flex-col gap-3"
        >
          <h2
            id="pending-title"
            className="text-[1.15rem] font-semibold tracking-[-0.02em]"
          >
            Pending invitations
          </h2>
          {invites.length === 0 ? (
            <EmptyState
              icon={<EnvelopeSimple weight="fill" className="h-5 w-5" />}
              title="No pending invitations"
              body="Invite a radiologist and send them the link. It appears here until they accept."
            />
          ) : (
            <ul className={`${PANEL} overflow-hidden`}>
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-6 py-4 first:border-t-0"
                >
                  <IconTile tone="amber">
                    <EnvelopeSimple weight="fill" className="h-5 w-5" />
                  </IconTile>
                  <p className="min-w-0 flex-1 basis-56 truncate text-[1.05rem] font-semibold">
                    {invite.email}
                  </p>
                  <Badge tone="amber">{ROLE_LABELS[invite.role as Role]}</Badge>
                  <span className="w-48">
                    <Meta icon={<Clock weight="bold" />}>
                      Expires {formatDate(invite.expires_at)}
                    </Meta>
                  </span>
                  <ConfirmAction
                    label="Cancel"
                    title="Cancel this invitation?"
                    body={`The link sent to ${invite.email} will stop working.`}
                    confirmLabel="Cancel invitation"
                    doneMessage="Invitation cancelled"
                    path={`/api/team/invites/${invite.id}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Page>
  );
}
