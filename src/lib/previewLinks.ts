import { hashToken } from "@/lib/auth/crypto";
import { db } from "@/lib/db";
import { likePattern, offsetOf, type ListParams, type Paged } from "@/lib/listQuery";

export { PREVIEW_DAYS } from "./previewLinkDays";

export type PreviewLink = {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  opens: number;
  lastOpenedAt: string | null;
  state: "active" | "expired" | "off";
};

/** One page of preview links, newest first, searched by who they are for. */
export async function pagePreviewLinks(params: ListParams): Promise<Paged<PreviewLink> & { active: number; all: number }> {
  const like = likePattern(params.q);
  const [rows, [counts]] = await Promise.all([
    db()`
      select id, label, created_at, expires_at, revoked_at, opens, last_opened_at,
             expires_at <= now() as expired, count(*) over () as total
      from preview_links
      where ${params.q} = '' or label ilike ${like}
      order by created_at desc, id
      limit ${params.size} offset ${offsetOf(params)}
    `,
    db()`
      select count(*)::int as all,
             count(*) filter (where revoked_at is null and expires_at > now())::int as active
      from preview_links
    `,
  ]);
  return {
    total: Number(rows[0]?.total ?? 0),
    active: counts?.active ?? 0,
    all: counts?.all ?? 0,
    rows: rows.map((row) => ({
      id: row.id,
      label: row.label,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      opens: row.opens,
      lastOpenedAt: row.last_opened_at?.toISOString() ?? null,
      state: row.revoked_at ? "off" : row.expired ? "expired" : "active",
    })),
  };
}

/** Who a working link was made for, counting this visit; null when the link is off, expired or unknown. */
export async function openPreviewLink(token: string): Promise<string | null> {
  const [row] = await db()`
    update preview_links set opens = opens + 1, last_opened_at = now()
    where token_hash = ${hashToken(token)} and revoked_at is null and expires_at > now()
    returning label
  `;
  return row?.label ?? null;
}
