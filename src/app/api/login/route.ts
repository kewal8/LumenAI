import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  newSessionToken,
  passwordConfigured,
  passwordMatches,
} from "@/lib/auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  if (!passwordConfigured()) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not set on the server." },
      { status: 503 },
    );
  }

  const { password } = await request.json();
  // Slow every attempt a little so the password cannot be guessed quickly.
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (typeof password !== "string" || !passwordMatches(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, newSessionToken()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
    path: "/",
  });
  return response;
}
