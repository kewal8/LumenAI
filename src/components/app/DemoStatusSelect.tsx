"use client";

import { toast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/components/auth/fields";
import { DEMO_STATUSES, DEMO_STATUS_LABELS, type DemoStatus } from "@/lib/demo";
import { Select } from "./ui";

export function DemoStatusSelect({ id, status }: { id: string; status: DemoStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: DemoStatus) {
    setBusy(true);
    const result = await send("PATCH", `/api/demo-requests/${id}`, { status: next });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      setValue(next);
      toast.success(`Marked as ${DEMO_STATUS_LABELS[next].toLowerCase()}`);
    }
    router.refresh();
  }

  return (
    <Select
      aria-label="Status"
      value={value}
      disabled={busy}
      onChange={(event) => change(event.target.value as DemoStatus)}
    >
      {DEMO_STATUSES.map((option) => (
        <option key={option} value={option}>
          {DEMO_STATUS_LABELS[option]}
        </option>
      ))}
    </Select>
  );
}
