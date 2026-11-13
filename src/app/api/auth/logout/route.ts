import { handle } from "@/lib/auth/respond";
import { endSession } from "@/lib/auth/session";

export const POST = handle(async () => {
  await endSession();
  return Response.json({ ok: true });
});
