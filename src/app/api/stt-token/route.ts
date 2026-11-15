import { getCurrentUser } from "@/lib/auth/session";
import { LOCKED_MESSAGE, editorLocked } from "@/lib/subscription";

// Issues a short-lived Deepgram token so the browser can stream audio
// straight to the STT service without the API key or audio touching our server.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Signed out. Sign in again." }, { status: 401 });
  }
  if (await editorLocked(user)) return Response.json({ error: LOCKED_MESSAGE }, { status: 402 });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY is not set. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl_seconds: 60 }),
  });

  if (!res.ok) {
    return Response.json(
      { error: `Deepgram token request failed (${res.status})` },
      { status: 502 },
    );
  }

  const { access_token } = await res.json();
  return Response.json({ token: access_token });
}
