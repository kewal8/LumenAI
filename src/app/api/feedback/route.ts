import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { FEEDBACK_MAX, FEEDBACK_PER_DAY } from "@/lib/feedback";

// Feedback from a signed-in person, sent from inside the app. Who sent it is
// taken from the session, never from the request. Staff read it in the admin
// panel.
export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return fail(400, "Write a message first.");
  if (message.length > FEEDBACK_MAX) {
    return fail(400, `Keep the message under ${FEEDBACK_MAX} characters.`);
  }
  // Only an address inside the app is kept as the page it came from.
  const page =
    typeof body.page === "string" && body.page.startsWith("/") ? body.page.split(/[?#]/)[0].slice(0, 200) : null;

  const [recent] = await db()`
    select count(*)::int as n from feedback
    where user_id = ${user.id} and created_at > now() - interval '1 day'
  `;
  if (recent.n >= FEEDBACK_PER_DAY) {
    return fail(429, "You have sent a lot of feedback today. Try again tomorrow.");
  }

  await db()`
    insert into feedback (user_id, org_id, sender_name, sender_email, org_name, message, page)
    values (${user.id}, ${user.org?.id ?? null}, ${user.name}, ${user.email}, ${user.org?.name ?? null},
            ${message}, ${page})
  `;
  return Response.json({ ok: true });
});
