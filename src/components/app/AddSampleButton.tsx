"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError, send } from "@/components/auth/fields";
import { toDraft } from "@/lib/templateInput";
import { CT_BRAIN_PLAIN } from "@/lib/templates";
import { buttonClass } from "./ui";

/** Copies the built-in CT Brain sample into the person's own templates. */
export function AddSampleButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    setBusy(true);
    const result = await send("POST", "/api/templates", toDraft(CT_BRAIN_PLAIN));
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={add} disabled={busy} className={buttonClass.secondary}>
        {busy ? "Adding" : "Add the sample CT Brain template"}
      </button>
      <FormError message={error} />
    </div>
  );
}
