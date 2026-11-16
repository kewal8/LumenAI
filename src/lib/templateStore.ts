import type { CurrentUser } from "@/lib/auth/session";
import { asUuid, db } from "@/lib/db";
import { canManageTeam } from "@/lib/team";
import type { Template } from "./report";
import type { DocNode } from "./reportDoc";
import { readTemplate } from "./templateDoc";
import { toTemplate, type TemplateDraft } from "./templateInput";
import { likePattern, offsetOf, type ListParams, type Paged } from "./listQuery";

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

/** How a template name is compared: spaces and letter case do not make a name different. */
export function templateNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Whether this person already has another template by this name, their own or shared with them. */
export async function nameTaken(user: CurrentUser, name: string, except: string | null = null) {
  if (!user.org) return false;
  const [row] = await db()`
    select 1 from templates
    where org_id = ${user.org.id} and (owner_id = ${user.id} or shared)
      and lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = ${templateNameKey(name)}
      and (${except}::uuid is null or id <> ${except}::uuid)
    limit 1
  `;
  return Boolean(row);
}


export async function findTemplate(user: CurrentUser, id: string) {
  if (!user.org) return null;
  const [row] = await db()`
    select t.*, u.name as owner_name
    from templates t join users u on u.id = t.owner_id
    where t.id = ${asUuid(id)}::uuid and t.org_id = ${user.org.id}
      and (t.owner_id = ${user.id} or t.shared)
  `;
  return row ? fromRow(row, user) : null;
}

/** One row of the Templates table: what the list shows, without the template itself. */
export type TemplateRow = {
  id: string;
  name: string;
  title: string;
  modality: string | null;
  shared: boolean;
  mine: boolean;
  ownerName: string;
  canEdit: boolean;
  updatedAt: string;
};

export const TEMPLATE_SORTS = ["name", "updated"];

/**
 * One page of the templates this person can use, searched, filtered and
 * sorted in the database. Only that page is read.
 */
export async function pageTemplates(user: CurrentUser, params: ListParams): Promise<Paged<TemplateRow>> {
  if (!user.org) return { rows: [], total: 0 };
  const like = likePattern(params.q);
  const owner = params.filter.owner ?? "";
  const modality = params.filter.modality ?? "";
  const rows = await db()`
    select t.id, t.name, t.title, t.modality, t.shared, t.owner_id, t.updated_at, u.name as owner_name,
           count(*) over () as total
    from templates t join users u on u.id = t.owner_id
    where t.org_id = ${user.org.id} and (t.owner_id = ${user.id} or t.shared)
      and (${params.q} = '' or t.name ilike ${like} or t.title ilike ${like} or coalesce(t.modality, '') ilike ${like})
      and (${owner} <> 'mine' or t.owner_id = ${user.id})
      and (${owner} <> 'shared' or t.shared or t.owner_id <> ${user.id})
      and (${modality} = '' or t.modality = ${modality})
    order by
      case when ${params.sort} = 'name' and ${params.dir} = 'asc' then lower(t.name) end asc,
      case when ${params.sort} = 'name' and ${params.dir} = 'desc' then lower(t.name) end desc,
      case when ${params.sort} = 'updated' and ${params.dir} = 'asc' then t.updated_at end asc,
      case when ${params.sort} = 'updated' and ${params.dir} = 'desc' then t.updated_at end desc,
      t.id
    limit ${params.size} offset ${offsetOf(params)}
  `;
  return {
    total: Number(rows[0]?.total ?? 0),
    rows: rows.map((row) => {
      const mine = row.owner_id === user.id;
      return {
        id: row.id,
        name: row.name,
        title: row.title,
        modality: row.modality ?? null,
        shared: row.shared,
        mine,
        ownerName: row.owner_name,
        canEdit: mine || canManageTeam(user.org?.role),
        updatedAt: row.updated_at.toISOString(),
      };
    }),
  };
}

/** What the filters can offer: the modalities in use, and whether anything is shared. */
export async function templateFacets(user: CurrentUser) {
  if (!user.org) return { modalities: [] as string[], anyShared: false, any: false };
  const [row] = await db()`
    select coalesce(array_agg(distinct t.modality) filter (where t.modality is not null), '{}') as modalities,
           bool_or(t.shared or t.owner_id <> ${user.id}) as any_shared,
           count(*) > 0 as any
    from templates t
    where t.org_id = ${user.org.id} and (t.owner_id = ${user.id} or t.shared)
  `;
  return {
    modalities: ((row?.modalities ?? []) as string[]).sort(),
    anyShared: Boolean(row?.any_shared),
    any: Boolean(row?.any),
  };
}

/** Templates whose names match, for choosing one on the report screen. */
export async function searchTemplateOptions(user: CurrentUser, q: string, limit = 20) {
  if (!user.org) return [];
  const like = likePattern(q.trim());
  const rows = await db()`
    select t.id, t.name, t.modality from templates t
    where t.org_id = ${user.org.id} and (t.owner_id = ${user.id} or t.shared)
      and (${q.trim()} = '' or t.name ilike ${like} or coalesce(t.modality, '') ilike ${like})
    order by lower(t.name), t.id
    limit ${limit}
  `;
  return rows.map((row) => ({ id: row.id as string, name: row.name as string, modality: (row.modality ?? null) as string | null }));
}

/**
 * A template ready to start a report: the one asked for, or else the one
 * changed most recently. Null when the person has none.
 */
export async function loadReportTemplate(user: CurrentUser, id: string | null): Promise<Template | null> {
  if (!user.org) return null;
  const valid = id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  const [row] = await db()`
    select t.*, u.name as owner_name
    from templates t join users u on u.id = t.owner_id
    where t.org_id = ${user.org.id} and (t.owner_id = ${user.id} or t.shared)
    order by (t.id = ${valid}::uuid) desc nulls last, t.updated_at desc
    limit 1
  `;
  return row ? asReportTemplate(fromRow(row, user)) : null;
}

/** A stored template as the report screen uses it, starting from its own page when it has one. */
export function asReportTemplate(stored: StoredTemplate): Template {
  // Written in the template editor: reports start from that page, as written.
  const read = stored.doc ? readTemplate(stored.doc as DocNode, stored.name) : null;
  return typeof read === "object" && read
    ? { ...toTemplate(stored.id, read.draft), doc: read.reportDoc, modality: stored.modality }
    : { ...toTemplate(stored.id, stored), modality: stored.modality };
}
