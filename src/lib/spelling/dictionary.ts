import { db } from "@/lib/db";

/** Most words an account can keep in its dictionary. */
export const MAX_DICTIONARY_WORDS = 5000;

/** The account's own spelling words, in alphabetical order. */
export async function listDictionaryWords(orgId: string) {
  const rows = await db()`
    select word from dictionary_words where org_id = ${orgId}
    order by lower(word), word limit ${MAX_DICTIONARY_WORDS}
  `;
  return rows.map((row) => row.word as string);
}
