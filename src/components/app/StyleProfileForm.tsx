"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowsClockwise, CheckCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { send } from "@/components/auth/fields";
import type { StyleProfile } from "@/lib/styleProfile";
import { BACKDROP, POPUP } from "./TeamClient";
import { buttonClass } from "./ui";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * The radiologist's reporting style as LumenAI has learned it: readable,
 * editable, and learned again or reset on request.
 */
export function StyleProfileForm({ initial, perBuild, max }: { initial: StyleProfile; perBuild: number; max: number }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial.profile);
  const [busy, setBusy] = useState<"save" | "learn" | "reset" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const changed = text.trim() !== saved.profile.trim();
  const toGo = Math.max(0, perBuild - saved.finalized);

  async function run(kind: "save" | "learn" | "reset") {
    setBusy(kind);
    const result = await send<{ profile: StyleProfile; changed?: boolean }>(
      kind === "save" ? "PATCH" : kind === "learn" ? "POST" : "DELETE",
      "/api/style-profile",
      kind === "save" ? { profile: text } : undefined,
    );
    setBusy(null);
    if (result.error || !result.data) {
      toast.error(result.error || "That did not work. Try again.");
      return;
    }
    const next = result.data.profile;
    setSaved(next);
    setText(next.profile);
    if (kind === "save") toast.success("Your reporting style is saved. New dictations use it.");
    else if (kind === "reset") toast.success("Started over. LumenAI learns your style again from your next finalized reports.");
    else if (result.data.changed) toast.success("Updated from your latest finalized reports.");
    else toast.warning("No new habits found in your latest reports, so your style is unchanged.");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-[0.98rem] leading-relaxed text-ink-soft">
        LumenAI writes your reports in your own words: the phrases you use for findings, how you say how sure you are, how you lay out the
        impression. It learns them from the reports you finalize, every {perBuild} reports. It only ever changes how a sentence is worded, never
        what it says. It keeps wording only, never a patient&apos;s details, and only your reports use it.
      </p>

      <p className="flex items-center gap-2 text-[0.92rem] font-semibold text-ink-soft" role="status">
        {saved.builtAt || saved.profile ? (
          <>
            <CheckCircle weight="fill" className="h-4 w-4 shrink-0 text-teal" />
            {saved.builtAt ? `Learned from your finalized reports, last on ${when(saved.builtAt)}` : "Written by you"}
            {saved.editedAt && saved.builtAt ? ` · edited by you on ${when(saved.editedAt)}` : ""}
          </>
        ) : toGo > 0 ? (
          `Finalize ${toGo} more report${toGo === 1 ? "" : "s"} and LumenAI starts learning your wording. You can also write it yourself below.`
        ) : (
          "Ready to learn from your finalized reports."
        )}
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.92rem] font-semibold text-ink">Your reporting style</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={max}
          rows={14}
          placeholder={
            "Positive findings:\n- \"Evidence of ... is noted.\"\n\nNegative findings:\n- \"No evidence of ...\"\n- \"The visualized portions of ... appear normal.\"\n\nCertainty:\n- \"Findings are suggestive of ...\"\n\nImpression:\n- Opens with \"Imaging features suggestive of ...\""
          }
          className="min-h-72 w-full resize-y rounded-2xl border border-ink/35 bg-surface px-4 py-3 font-medium leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-quiet hover:border-ink/55 focus:border-teal"
        />
        <span className="text-right text-[0.82rem] tabular-nums text-ink-quiet">
          {text.length.toLocaleString("en-IN")} / {max.toLocaleString("en-IN")}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" disabled={!changed || busy !== null} onClick={() => run("save")} className={buttonClass.primary}>
          {busy === "save" && <Spinner />}
          {busy === "save" ? "Saving" : "Save"}
        </button>
        <button
          type="button"
          disabled={busy !== null || toGo > 0 || changed}
          title={changed ? "Save or undo your edit first" : toGo > 0 ? `Finalize ${toGo} more report${toGo === 1 ? "" : "s"} first` : undefined}
          onClick={() => run("learn")}
          className={buttonClass.secondary}
        >
          {busy === "learn" ? <Spinner /> : <ArrowsClockwise weight="bold" className="h-4 w-4" />}
          {busy === "learn" ? "Learning" : "Learn from my reports now"}
        </button>
        {(saved.profile || saved.builtAt) && (
          <button type="button" disabled={busy !== null} onClick={() => setConfirmReset(true)} className={`${buttonClass.quiet} ml-auto`}>
            Start over
          </button>
        )}
      </div>

      <Dialog.Root open={confirmReset} onOpenChange={setConfirmReset}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Start your style over?</Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              Your reporting style is cleared, including anything you wrote here. Dictations follow the template&apos;s wording until LumenAI has
              learned from your next {perBuild} finalized reports.
            </Dialog.Description>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  void run("reset");
                }}
                className={buttonClass.danger}
              >
                Start over
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
