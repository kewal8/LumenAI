import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isAuthorised } from "@/lib/auth";

// Issues a short-lived Deepgram token so the browser can stream audio
// straight to the STT service without the API key or audio touching our server.
export async function POST(request: NextRequest) {
  // The proxy already blocks signed-out requests; checked again here so the
  // route stays protected if the proxy matcher ever changes.
  if (!isAuthorised(request.cookies.get(SESSION_COOKIE)?.value)) {
    return Response.json({ error: "Signed out." }, { status: 401 });
  }

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
