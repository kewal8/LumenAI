import { db } from "@/lib/db";
import type { Macro } from "@/lib/macros";

export async function listMacros(userId: string): Promise<Macro[]> {
  const rows = await db()`
    select id, short_form, body from macros where user_id = ${userId} order by lower(short_form)
  `;
  return rows.map((row) => ({ id: row.id, shortForm: row.short_form, body: row.body }));
}
