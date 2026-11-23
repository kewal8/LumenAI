"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowCounterClockwise, Check, ListChecks, X } from "@phosphor-icons/react";
import { useState } from "react";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { buttonClass } from "@/components/app/ui";
import type { ReportSnap } from "./editor/reportLines";

/**
 * One change the AI made to the report in one dictation. It shows in the
 * report straight away, marked as waiting, and becomes part of the report
 * only once the radiologist accepts it; ignoring it puts the line back as it was.
 */
export type AiChange = {
  key: string;
  /** The section it is in, or "Impression". */
  label: string;
  before: string;
  after: string;
  state: "pending" | "accepted" | "ignored";
  /** For a report line: the line as it was and as the AI left it. */
  line?: {
    lineId: string;
    sectionId: string | null;
    prev: string | null;
    beforeNode: unknown;
    afterNode: unknown;
    beforeText: string | null;
    afterText: string | null;
  };
  /** For the impression: the whole list as it was and as the AI left it. */
  impression?: { before: string[]; after: string[] };
};

/** What one dictation changed, line by line, from the report before and after it. */
export function changesBetween(before: ReportSnap, after: ReportSnap, headingOf: (sectionId: string | null) => string): AiChange[] {
  const changes: AiChange[] = [];
  const was = new Map(before.lines.map((line) => [line.lineId, line]));
  const now = new Map(after.lines.map((line) => [line.lineId, line]));
  for (const line of after.lines) {
    const old = was.get(line.lineId);
    if (old && old.text === line.text) continue;
    changes.push({
      key: line.lineId,
      label: headingOf(line.sectionId),
      before: old?.text ?? "",
      after: line.text,
      state: "pending",
      line: {
        lineId: line.lineId,
        sectionId: line.sectionId,
        prev: old?.prev ?? line.prev,
        beforeNode: old?.node ?? null,
        afterNode: line.node,
        beforeText: old?.text ?? null,
        afterText: line.text,
      },
    });
  }
  // Lines the AI took out, such as an organ that does not apply to this patient.
  for (const line of before.lines) {
    if (now.has(line.lineId)) continue;
    changes.push({
      key: line.lineId,
      label: headingOf(line.sectionId),
      before: line.text,
      after: "",
      state: "pending",
      line: {
        lineId: line.lineId,
        sectionId: line.sectionId,
        prev: line.prev,
        beforeNode: line.node,
        afterNode: null,
        beforeText: line.text,
        afterText: null,
      },
    });
  }
  if (before.impression.join("\n") !== after.impression.join("\n")) {
    changes.push({
      key: "impression",
      label: "Impression",
      before: before.impression.join("\n"),
      after: after.impression.join("\n"),
      state: "pending",
      impression: { before: before.impression, after: after.impression },
    });
  }
  return changes;
}

const SMALL =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.85rem] font-semibold transition-colors disabled:opacity-50";

/**
 * The review controls under one dictation's reply in the AI chat: accept or
 * ignore everything, pick change by change, and take accepted changes back.
 */
export function AiReview({
  changes,
  onAccept,
  onIgnore,
  onUndo,
}: {
  changes: AiChange[];
  /** Accept these changes; they become part of the report. */
  onAccept: (keys: string[]) => void;
  /** Put these lines back as they were before the dictation. */
  onIgnore: (keys: string[]) => void;
  /** Take back accepted changes: the findings return to how they were before this dictation. */
  onUndo: (keys: string[]) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const pending = changes.filter((change) => change.state === "pending");
  const accepted = changes.filter((change) => change.state === "accepted");
  const ignored = changes.filter((change) => change.state === "ignored");
  const keys = (list: AiChange[]) => list.map((change) => change.key);

  if (changes.length === 0) return null;

  // Everything decided: a quiet summary, and a way back for what was accepted.
  if (pending.length === 0) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
        <span className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-ink-soft">
          <Check weight="bold" className="h-3.5 w-3.5 text-teal-deep" />
          {accepted.length > 0 && `${accepted.length} accepted`}
          {accepted.length > 0 && ignored.length > 0 && " · "}
          {ignored.length > 0 && `${ignored.length} ignored`}
        </span>
        {accepted.length > 0 && (
          <button
            type="button"
            onClick={() => onUndo(keys(accepted))}
            className={`${SMALL} ml-auto text-ink-soft hover:bg-ink/[0.06] hover:text-ink`}
          >
            <ArrowCounterClockwise weight="bold" className="h-3.5 w-3.5" />
            Undo changes
          </button>
        )}
      </div>
    );
  }

  if (reviewing) {
    return (
      <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
        <p className="text-[0.82rem] font-semibold text-ink-soft">Tick the changes to keep</p>
        <ul className="flex flex-col gap-1.5">
          {pending.map((change) => (
            <li key={change.key}>
              <label className="flex cursor-pointer gap-2.5 rounded-xl px-2 py-1.5 hover:bg-ink/[0.04]">
                <input
                  type="checkbox"
                  checked={picked.has(change.key)}
                  onChange={(event) =>
                    setPicked((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(change.key);
                      else next.delete(change.key);
                      return next;
                    })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal"
                />
                <span className="min-w-0 text-[0.85rem] leading-snug">
                  <span className="block font-bold">{change.label}</span>
                  {change.before && (
                    <span className="block whitespace-pre-line text-ink-quiet line-through decoration-ink/40">{change.before}</span>
                  )}
                  {change.after ? (
                    <span className="block whitespace-pre-line text-ink">{change.after}</span>
                  ) : (
                    <span className="block font-semibold text-ink-soft">Line removed</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              const keep = pending.filter((change) => picked.has(change.key));
              const drop = pending.filter((change) => !picked.has(change.key));
              if (keep.length) onAccept(keys(keep));
              if (drop.length) onIgnore(keys(drop));
              setReviewing(false);
            }}
            className={`${SMALL} bg-btn text-btn-text hover:bg-teal-deep`}
          >
            Apply selected ({picked.size})
          </button>
          <button type="button" onClick={() => setReviewing(false)} className={`${SMALL} text-ink-soft hover:bg-ink/[0.06] hover:text-ink`}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
      <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-amber-deep">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber" />
        {pending.length} {pending.length === 1 ? "change waits" : "changes wait"} for your review
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onAccept(keys(pending))} className={`${SMALL} bg-btn text-btn-text hover:bg-teal-deep`}>
          <Check weight="bold" className="h-3.5 w-3.5" />
          Accept all
        </button>
        <button
          type="button"
          onClick={() => {
            setPicked(new Set(keys(pending)));
            setReviewing(true);
          }}
          className={`${SMALL} border border-ink/30 text-ink hover:bg-ink/[0.05]`}
        >
          <ListChecks weight="bold" className="h-3.5 w-3.5" />
          Review
        </button>
        <button type="button" onClick={() => setConfirming(true)} className={`${SMALL} text-ink-soft hover:bg-ink/[0.06] hover:text-ink`}>
          <X weight="bold" className="h-3.5 w-3.5" />
          Ignore all
        </button>
      </div>

      <Dialog.Root open={confirming} onOpenChange={setConfirming}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
              Ignore {pending.length === 1 ? "this change" : `all ${pending.length} changes`}?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              The lines go back to how they read before this dictation. A line you have edited since stays as you wrote it.
            </Dialog.Description>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onIgnore(keys(pending));
                  setConfirming(false);
                }}
                className={buttonClass.danger}
              >
                Ignore {pending.length === 1 ? "change" : "all"}
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/** Lines still waiting, drawn in amber in the report; screen only, never copied or printed. */
export function pendingStyle(changes: AiChange[]) {
  const waiting = changes.filter((change) => change.state === "pending");
  const rules = waiting
    .filter((change) => change.line?.afterNode)
    .map((change) => `.report-doc p[data-line-id="${CSS.escape(change.line!.lineId)}"]`);
  if (waiting.some((change) => change.impression)) rules.push(".report-doc p[data-impression]");
  if (!rules.length) return "";
  return `${rules.join(",")}{background:color-mix(in srgb,var(--c-amber) 16%,transparent)!important;box-shadow:inset 3px 0 0 var(--c-amber)!important}`;
}
