"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckCircle, Circle, WarningCircle, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Tip } from "@/components/Tip";
import { toast } from "@/components/Toast";
import { send } from "@/components/auth/fields";

type Issue = {
  line: number;
  kind: "spelling" | "grammar" | "filler" | "organ";
  find: string;
  replace: string;
  reason: string;
  /** For a whole line that should go: removes it; false when the line has changed. */
  remove?: () => boolean;
};

const KIND: Record<Issue["kind"], string> = { spelling: "Spelling", grammar: "Grammar", filler: "Filler", organ: "Patient's sex" };

/** One step of the Validate and Finalize pair: an empty ring until done, then a green tick and less weight. */
export const STEP =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.92rem] transition-colors hover:bg-surface active:scale-[0.98] disabled:cursor-progress";
export const STEP_DONE = "font-medium text-ink-soft hover:text-ink";
export const STEP_ICON = "h-[18px] w-[18px] shrink-0";

const SMALL =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.85rem] font-semibold transition-colors disabled:opacity-50";

/**
 * Checks the report's spelling, grammar and filler words before it is
 * finalized. Each problem is a suggestion the doctor fixes or ignores; nothing
 * changes by itself. One check uses one AI update.
 */
export function ValidateButton({
  getLines,
  fixText,
  disabled,
  validated,
  onChecked,
  onIssues,
  organIssues,
}: {
  getLines: () => string[];
  fixText: (line: number, find: string, replace: string) => boolean;
  disabled: boolean;
  /** The report as it is now passed a check (or every suggestion was dealt with). */
  validated: boolean;
  /** Called once a check has used an AI update. */
  onChecked: () => void;
  /** Suggestions still open after a check: 0 once none were found or all were fixed or ignored. */
  onIssues: (count: number) => void;
  /** Lines about organs of one sex that do not fit the patient, found without the AI. */
  organIssues?: () => { text: string; reason: string; remove: () => boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<(Issue & { key: number })[] | null>(null);

  async function check() {
    setOpen(true);
    setChecking(true);
    setIssues(null);
    const result = await send<{ issues: Issue[] }>("POST", "/api/validate", { lines: getLines() });
    setChecking(false);
    if (result.error || !result.data) {
      setOpen(false);
      toast.error(result.error || "The check could not be done. Try again.");
      return;
    }
    onChecked();
    // Lines that do not fit the patient's sex come first: they matter most.
    const organs: Issue[] = (organIssues?.() ?? []).map((issue) => ({
      line: -1,
      kind: "organ",
      find: issue.text,
      replace: "",
      reason: issue.reason,
      remove: issue.remove,
    }));
    const found = [...organs, ...result.data.issues];
    setIssues(found.map((issue, key) => ({ ...issue, key })));
    onIssues(found.length);
    if (found.length === 0) {
      setOpen(false);
      toast.success("Validated. No issues found.");
    }
  }

  function drop(key: number) {
    const left = (issues ?? []).filter((issue) => issue.key !== key);
    setIssues(left);
    onIssues(left.length);
    if (!left.length) {
      setOpen(false);
      toast.success("All suggestions dealt with. Report validated.");
    }
  }

  const apply = (issue: Issue) => (issue.remove ? issue.remove() : fixText(issue.line, issue.find, issue.replace));

  function fix(issue: Issue & { key: number }) {
    if (!apply(issue)) {
      toast.warning("That text has changed since the check, so it was left as it is.");
    }
    drop(issue.key);
  }

  function fixAll() {
    // Whole lines are never removed in bulk: each one is the doctor's own decision.
    const list = (issues ?? []).filter((issue) => !issue.remove);
    const kept = (issues ?? []).filter((issue) => issue.remove);
    const done = list.filter(apply).length;
    setIssues(kept);
    onIssues(kept.length);
    if (done === list.length) toast.success(done === 1 ? "1 fix made" : `${done} fixes made`);
    else toast.warning(`${done} of ${list.length} fixes made. The rest of the text had changed.`);
    if (!kept.length) setOpen(false);
  }

  // Suggestions from the last check still waiting for Fix or Ignore.
  const pending = !checking && issues ? issues.length : 0;

  return (
    <Popover.Root open={open} onOpenChange={(next) => !checking && setOpen(next)}>
      <Tip label={validated ? "Validated. Press to check again · uses 1 AI update" : "Validate: check spelling, grammar and filler words · uses 1 AI update"}>
        <Popover.Trigger
          onClick={(event) => {
            // Each press runs a fresh check of the report as it is now, rather than toggling.
            event.preventBaseUIHandler();
            if (!checking) check();
          }}
          disabled={disabled || checking}
          className={`${STEP} ${validated && !checking ? STEP_DONE : pending ? "font-bold text-amber-deep" : "font-bold text-ink"} data-[popup-open]:bg-surface`}
        >
          {checking ? (
            <Spinner />
          ) : validated ? (
            <CheckCircle weight="fill" className={`${STEP_ICON} text-teal`} />
          ) : pending ? (
            <WarningCircle weight="fill" className={STEP_ICON} />
          ) : (
            <Circle weight="bold" className={`${STEP_ICON} text-ink-quiet`} />
          )}
          {checking ? "Validating" : validated ? "Validated" : pending ? `${pending} to fix` : "Validate"}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup className="app-layer flex max-h-[min(34rem,calc(100dvh-8rem))] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-3xl border border-ink/20 bg-surface shadow-[0_18px_50px_-18px_rgb(6_17_15/0.45)] outline-none">
            <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-3.5">
              <Popover.Title className="text-[1.05rem] font-semibold">
                {checking
                  ? "Checking the report"
                  : issues && issues.length > 0
                    ? `${issues.length} suggestion${issues.length === 1 ? "" : "s"}`
                    : "Validation"}
              </Popover.Title>
              {issues && issues.length > 1 && (
                <button type="button" onClick={fixAll} className={`${SMALL} ml-auto bg-btn text-btn-text hover:bg-teal-deep`}>
                  Fix all
                </button>
              )}
              <Popover.Close
                aria-label="Close"
                className={`grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink ${
                  issues && issues.length > 1 ? "" : "ml-auto"
                }`}
              >
                <X weight="bold" className="h-4 w-4" />
              </Popover.Close>
            </div>

            {checking ? (
              <p className="flex items-center gap-2.5 px-5 py-6 text-ink-soft">
                <Spinner />
                Checking spelling, grammar and filler words.
              </p>
            ) : issues && issues.length === 0 ? (
              <p className="flex items-center gap-2.5 px-5 py-6 font-semibold">
                <CheckCircle weight="fill" className="h-5 w-5 shrink-0 text-go" />
                Nothing to fix. The report reads clean.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain">
                {issues?.map((issue) => (
                  <li key={issue.key} className="px-5 py-3.5">
                    <p className="text-[0.78rem] font-bold uppercase tracking-[0.06em] text-ink-quiet">
                      {KIND[issue.kind]}
                    </p>
                    <p className="mt-1 text-[0.98rem] leading-snug">
                      <span className="rounded bg-flag/10 px-1 text-flag line-through decoration-flag/60">{issue.find}</span>
                      <span aria-hidden="true" className="px-1.5 text-ink-quiet">
                        →
                      </span>
                      {issue.replace ? (
                        <span className="rounded bg-teal-tint px-1 font-semibold text-teal-deep">{issue.replace}</span>
                      ) : (
                        <span className="font-semibold text-ink-soft">remove</span>
                      )}
                    </p>
                    <p className="mt-1 text-[0.88rem] text-ink-soft">{issue.reason}</p>
                    <div className="mt-2.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => fix(issue)}
                        className={`${SMALL} border border-ink/40 text-ink hover:bg-ink/[0.06]`}
                      >
                        {issue.replace ? "Fix" : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => drop(issue.key)}
                        className={`${SMALL} text-ink-soft hover:bg-ink/[0.06] hover:text-ink`}
                      >
                        Ignore
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
