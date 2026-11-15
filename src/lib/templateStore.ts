import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";
import type { TemplateDraft } from "./templateInput";

export type StoredTemplate = TemplateDraft & {
  id: string;
  modality: string | null;
  /** The document as written in the template editor; null for older templates. */
  doc: unknown;
  shared: boolean;
  mine: boolean;
  ownerName: string;
  canEdit: boolean;
  updatedAt: string;
};

type Row = Record<string, unknown>;

function fromRow(row: Row, user: CurrentUser): StoredTemplate {
  const mine = row.owner_id === user.id;
  return {
    id: row.id as string,
    name: row.name as string,
    modality: (row.modality as string | null) ?? null,
    doc: row.doc ?? null,
    title: row.title as string,
    sections: row.sections as TemplateDraft["sections"],
    normalImpression: row.normal_impression as string[],
    shared: row.shared as boolean,
    mine,
    ownerName: row.owner_name as string,
    // Your own templates, plus shared ones if you manage the organisation.
    canEdit: mine || canManageTeam(user.org?.role),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/** Templates this person can use: their own, and those shared in their organisation. */
export async function listTemplates(user: CurrentUser): Promise<StoredTemplate[]> {
  if (!user.org) return [];
  const rows = await db()`
    select t.*, u.name as owner_name
    from templates t join users u on u.id = t.owner_id
    where t.org_id = ${user.org.id} and (t.owner_id = ${user.id} or t.shared)
    order by (t.owner_id = ${user.id}) desc, lower(t.name)
  `;
  return rows.map((row) => fromRow(row, user));
}

export async function findTemplate(user: CurrentUser, id: string) {
  if (!user.org) return null;
  const [row] = await db()`
    select t.*, u.name as owner_name
    from templates t join users u on u.id = t.owner_id
    where t.id::text = ${id} and t.org_id = ${user.org.id}
      and (t.owner_id = ${user.id} or t.shared)
  `;
  return row ? fromRow(row, user) : null;
}
