import { hashToken } from "@/lib/auth/crypto";
import { db } from "@/lib/db";

export const PREVIEW_DAYS = [7, 14, 30];

export type PreviewLink = {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  opens: number;
  lastOpenedAt: string | null;
  state: "active" | "expired" | "off";
};

export async function listPreviewLinks(): Promise<PreviewLink[]> {
  const rows = await db()`
    select id, label, created_at, expires_at, revoked_at, opens, last_opened_at,
           expires_at <= now() as expired
    from preview_links order by created_at desc
  `;
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    opens: row.opens,
    lastOpenedAt: row.last_opened_at?.toISOString() ?? null,
    state: row.revoked_at ? "off" : row.expired ? "expired" : "active",
  }));
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
