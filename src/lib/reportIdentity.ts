import { db } from "@/lib/db";

/** What a doctor puts on their reports besides the findings. */
export type ReportIdentity = {
  /** Sign-off lines under the report: name, qualification, registration number. */
  signatureText: string;
  signatureImage: string | null;
  headerImage: string | null;
  footerImage: string | null;
  /** Whether printed and PDF reports carry the letterhead. */
  letterheadEnabled: boolean;
};

export const NO_IDENTITY: ReportIdentity = {
  signatureText: "",
  signatureImage: null,
  headerImage: null,
  footerImage: null,
  letterheadEnabled: false,
};

export const SIGNATURE_TEXT_LIMIT = 400;
// Length of the data URL. The browser shrinks images before sending them.
export const SIGNATURE_IMAGE_LIMIT = 300_000;
export const LETTERHEAD_IMAGE_LIMIT = 900_000;

const DATA_URL = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;

/** A submitted image: a PNG or JPEG data URL within `limit`, null to remove, or an error message. */
export function parseImage(value: unknown, limit: number): string | null | { error: string } {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !DATA_URL.test(value)) return { error: "Use a PNG or JPG image." };
  if (value.length > limit) return { error: "That image is too large. Try a smaller one." };
  return value;
}

export async function getIdentity(userId: string): Promise<ReportIdentity> {
  const [row] = await db()`
    select signature_text, signature_image, header_image, footer_image, letterhead_enabled
    from report_identity where user_id = ${userId}
  `;
  if (!row) return NO_IDENTITY;
  return {
    signatureText: row.signature_text,
    signatureImage: row.signature_image,
    headerImage: row.header_image,
    footerImage: row.footer_image,
    letterheadEnabled: row.letterhead_enabled,
  };
}

export async function saveIdentity(userId: string, next: ReportIdentity) {
  await db()`
    insert into report_identity
      (user_id, signature_text, signature_image, header_image, footer_image, letterhead_enabled)
    values (${userId}, ${next.signatureText}, ${next.signatureImage}, ${next.headerImage},
            ${next.footerImage}, ${next.letterheadEnabled})
    on conflict (user_id) do update set
      signature_text = excluded.signature_text,
      signature_image = excluded.signature_image,
      header_image = excluded.header_image,
      footer_image = excluded.footer_image,
      letterhead_enabled = excluded.letterhead_enabled,
      updated_at = now()
  `;
}
