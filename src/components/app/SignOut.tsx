"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { buttonClass } from "./ui";

/**
 * Signing out ends the session on this device, so it asks first. `ask` opens
 * the question; render `dialog` once wherever the button lives.
 */
export function useSignOut() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  const dialog = (
    <Dialog.Root open={open} onOpenChange={(next) => !signingOut && setOpen(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#0f2624]/40" />
        <Dialog.Popup className="app-layer sheet fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] outline-none sm:p-8">
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Sign out?</Dialog.Title>
          <Dialog.Description className="mt-2 text-ink-soft">
            You will need your email and password to sign in again. A report that is not saved will be lost.
          </Dialog.Description>
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={signOut} disabled={signingOut} className={buttonClass.primary}>
              {signingOut && <Spinner />}
              {signingOut ? "Signing out" : "Sign out"}
            </button>
            <Dialog.Close className={buttonClass.secondary} disabled={signingOut}>
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return { ask: () => setOpen(true), dialog };
}
