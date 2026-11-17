import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { normaliseWord } from "@/lib/spelling/words";

// Takes one word out of the account's dictionary, so it is underlined again.
export const DELETE = handle<RouteContext<"/api/dictionary/[word]">>(async (_request, { params }) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");
  const raw = (await params).word;
  // Dictionary words never contain "%", so one still here means it was not decoded yet.
  const word = normaliseWord(raw.includes("%") ? safeDecode(raw) : raw);
  if (!word) return fail(400, "That is not a word in your dictionary.");
  const [removed] = await db()`
    delete from dictionary_words where org_id = ${user.org.id} and word = ${word} returning word
  `;
  if (!removed) return fail(404, "That word is not in your dictionary.");
  return Response.json({ ok: true });
});

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
