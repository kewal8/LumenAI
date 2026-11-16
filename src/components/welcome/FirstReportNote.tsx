"use client";

import { useEffect, useState } from "react";
import { send } from "@/components/auth/fields";
import { FirstReportCard } from "./FirstReportCard";

/**
 * The first-report card as it appears on the Reports list. It counts as seen
 * the moment it shows, so it never comes back; closing it just hides it now.
 */
export function FirstReportNote({ firstName, took }: { firstName: string; took: string | null }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    void send("POST", "/api/moments", { moment: "first-report" });
  }, []);

  if (!open) return null;
  return <FirstReportCard firstName={firstName} took={took} onClose={() => setOpen(false)} />;
}
