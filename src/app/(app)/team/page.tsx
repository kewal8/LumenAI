import { ConfirmAction, InviteButton, RoleSelect } from "@/components/app/TeamClient";
import { Badge, EmptyState, PANEL, Page, PageHeader, formatDate } from "@/components/app/ui";
import { requireUser, type Role } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABELS, assignableRoles, canManageMember, canManageTeam } from "@/lib/team";

export const metadata = { title: "Team · LumenAI" };

export default async function TeamPage() {
  const user = await requireUser();
  if (!user.org) {
    return (
      <Page>
        <PageHeader title="Team" />
        <EmptyState
          title="No organisation"
          body="Your account is not part of an organisation yet. Ask LumenAI to set one up."
        />
      </Page>
    );
  }

  const sql = db();
  const [members, invites] = await Promise.all([
    sql`
      select u.id, u.name, u.email, u.last_login_at, m.role
      from memberships m join users u on u.id = m.user_id
      where m.org_id = ${user.org.id}
      order by array_position(array['owner', 'admin', 'radiologist'], m.role), u.name
    `,
    sql`
      select id, email, role, expires_at from invites
      where org_id = ${user.org.id} and accepted_at is null and expires_at > now()
      order by created_at desc
    `,
  ]);

  const actor = { id: user.id, role: user.org.role };
  const roles = assignableRoles(user.org.role);
  const manages = canManageTeam(user.org.role);

  return (
    <Page>
      <PageHeader
        title="Team"
        description={`People who report under ${user.org.name}.`}
        action={manages ? <InviteButton roles={roles} /> : undefined}
      />

      <section aria-label="Members" className={`${PANEL} overflow-hidden`}>
        <ul>
          {members.map((member) => {
            const target = { id: member.id as string, role: member.role as Role };
            const manageable = canManageMember(actor, target);
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line px-6 py-4 first:border-t-0"
              >
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{member.name}</span>
                    {member.id === user.id && <Badge>You</Badge>}
                  </p>
                  <p className="truncate text-[0.9rem] text-ink-soft">{member.email}</p>
                </div>
                <p className="w-40 text-[0.9rem] text-ink-soft">
                  Last sign-in: {formatDate(member.last_login_at)}
                </p>
                <div className="flex w-56 items-center justify-end gap-1">
                  {manageable ? (
                    <>
                      <RoleSelect memberId={target.id} role={target.role} roles={roles} />
                      <ConfirmAction
                        label="Remove"
                        title={`Remove ${member.name}?`}
                        body="Their account is deleted and they are signed out everywhere. You can invite them again later."
                        confirmLabel="Remove"
                        path={`/api/team/members/${target.id}`}
                      />
                    </>
                  ) : (
                    <Badge tone={target.role === "owner" ? "teal" : "neutral"}>
                      {ROLE_LABELS[target.role]}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {manages && (
        <section aria-labelledby="pending-title" className="flex flex-col gap-3">
          <h2 id="pending-title" className="text-[1.15rem] font-semibold tracking-[-0.02em]">
            Pending invitations
          </h2>
          {invites.length === 0 ? (
            <EmptyState
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
                  <p className="min-w-0 flex-1 basis-56 truncate font-semibold">{invite.email}</p>
                  <Badge tone="amber">{ROLE_LABELS[invite.role as Role]}</Badge>
                  <p className="w-44 text-[0.9rem] text-ink-soft">
                    Expires {formatDate(invite.expires_at)}
                  </p>
                  <ConfirmAction
                    label="Cancel"
                    title="Cancel this invitation?"
                    body={`The link sent to ${invite.email} will stop working.`}
                    confirmLabel="Cancel invitation"
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
