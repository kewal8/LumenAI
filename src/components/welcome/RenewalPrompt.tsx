"use client";

import { Dialog } from "@base-ui/react/dialog";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BACKDROP } from "@/components/app/ui";
import { send } from "@/components/auth/fields";
import type { RenewalDue } from "@/lib/moments";
import { RenewalReminder } from "./RenewalReminder";

/**
 * Puts the renewal reminder up on the next page the owner opens, never over a
 * report being written. "Remind me tomorrow" (or "Later today" on the last
 * day) puts it off; any other way of closing it counts as seen.
 */
export function RenewalPrompt({ due, firstName }: { due: RenewalDue; firstName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const lastDay = due.daysLeft <= 1;
  // The report screen is where the doctor works; the reminder waits for the next page.
  const writing = pathname === "/report" || pathname.startsWith("/report/");

  function close(snoozeHours: number | null) {
    setOpen(false);
    // Remembered quietly: if it fails, the reminder simply shows once more.
    void send("POST", "/api/moments", { moment: due.moment, snoozeHours });
  }

  return (
    <Dialog.Root open={open && !writing} onOpenChange={(next) => !next && close(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup
          aria-labelledby="renewal-title"
          className="app-layer fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none"
        >
          <RenewalReminder
            firstName={firstName}
            planName={due.planName}
            endsOn={due.endsOn}
            daysLeft={due.daysLeft}
            reports={due.reports}
            onLater={() => close(lastDay ? 4 : 24)}
            onRenew={() => close(null)}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
