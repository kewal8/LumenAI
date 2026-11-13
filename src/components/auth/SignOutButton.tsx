"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-full border border-ink/40 px-4 py-1.5 font-semibold transition-[background-color,color,transform] duration-200 hover:bg-btn hover:text-btn-text active:scale-[0.98] disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
