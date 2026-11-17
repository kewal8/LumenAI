import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { listDictionaryWords, MAX_DICTIONARY_WORDS } from "@/lib/spelling/dictionary";
import { normaliseWord } from "@/lib/spelling/words";

// The account's own spelling dictionary: words added from the right-click menu
// on a report or in Settings, shared by everyone on the account.

export const GET = handle(async () => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return Response.json({ words: [] });
  return Response.json({ words: await listDictionaryWords(user.org.id) });
});

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");
  const word = normaliseWord((await request.json()).word);
  if (!word) return fail(400, "Add one word at a time, using letters and numbers only.");
  const [count] = await db()`select count(*)::int as n from dictionary_words where org_id = ${user.org.id}`;
  if (count.n >= MAX_DICTIONARY_WORDS) {
    return fail(409, "Your dictionary is full. Remove some words in Settings first.");
  }
  await db()`
    insert into dictionary_words (org_id, word, added_by) values (${user.org.id}, ${word}, ${user.id})
    on conflict do nothing
  `;
  return Response.json({ ok: true, word });
});
