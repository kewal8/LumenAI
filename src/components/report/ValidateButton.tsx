"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckCircle, Circle, WarningCircle, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Tip } from "@/components/Tip";
import { toast } from "@/components/Toast";
import { send } from "@/components/auth/fields";

type Issue = {
  line: number;
  kind: "spelling" | "grammar" | "filler" | "organ" | "impression" | "continuity";
  find: string;
  replace: string;
  reason: string;
  /** For a whole line that should go: removes it; false when the line has changed. */
  remove?: () => boolean;
  /** For the impression: applies this change to it; false when the item has changed. */
  apply?: () => boolean;
};

/** What the impression check found wrong with one item. */
type ImpressionIssue = {
  kind: "unsupported" | "missing" | "stale" | "contradictory" | "duplicate";
  find: string;
  replace: string;
  reason: string;
};

/** The report's parts the impression and continuity checks need. */
export type ValidateContext = {
  findings: { heading: string; lines: string[] }[];
  templateNormal: { heading: string; lines: string[] }[];
  impression: string[];
  correlation: string[];
  hasImpression: boolean;
};

const KIND: Record<Issue["kind"], string> = {
  spelling: "Spelling",
  grammar: "Grammar",
  filler: "Filler",
  organ: "Patient's sex",
  impression: "Impression",
  continuity: "Normal findings",
};

const IMPRESSION_KIND: Record<ImpressionIssue["kind"], string> = {
  unsupported: "not supported by the findings",
  missing: "a finding is missing",
  stale: "out of date",
  contradictory: "contradicts the findings",
  duplicate: "said twice",
};

/** Suggestions only the doctor decides, one by one: never part of Fix all. */
const OWN_DECISION = (issue: Issue) => Boolean(issue.remove || issue.apply) || issue.kind === "continuity";

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
  removeEmptyLines,
  getContext,
  fixImpression,
  checkRequest = 0,
  onCheckFailed,
  className = STEP,
  side = "bottom",
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
  /** Takes out lines left empty before the check, so the report closes up; how many went. */
  removeEmptyLines?: () => number;
  /** Findings, template wording and impression, for the impression and continuity checks. */
  getContext?: () => ValidateContext | null;
  /** Changes one impression item ("" find adds one, "" replace removes it); false when it has changed. */
  fixImpression?: (find: string, replace: string) => boolean;
  /** Raised by Finalize to run a check without a press on this button. */
  checkRequest?: number;
  /** The check could not run (no connection, no updates left). */
  onCheckFailed?: () => void;
  /** The button's shape; the Validate and Finalize pill by default. */
  className?: string;
  /** Where the list of suggestions opens: above when the button sits at the bottom of a phone. */
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<(Issue & { key: number })[] | null>(null);

  async function check() {
    setOpen(true);
    setChecking(true);
    setIssues(null);
    // Gaps left by cut or cleared lines close up first, so the check reads the report as it will be.
    const tidied = removeEmptyLines?.() ?? 0;
    if (tidied) toast.success(tidied === 1 ? "1 empty line removed. Undo brings it back." : `${tidied} empty lines removed. Undo brings them back.`);
    const result = await send<{ issues: Issue[]; impressionIssues?: ImpressionIssue[] }>("POST", "/api/validate", {
      lines: getLines(),
      ...(getContext?.() ?? {}),
    });
    setChecking(false);
    if (result.error || !result.data) {
      setOpen(false);
      toast.error(result.error || "The check could not be done. Try again.");
      onCheckFailed?.();
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
    // Then the impression against the final findings: it is what the referring doctor reads first.
    const impression: Issue[] = (fixImpression ? (result.data.impressionIssues ?? []) : []).map((issue) => ({
      line: -1,
      kind: "impression",
      find: issue.find,
      replace: issue.replace,
      reason: `${IMPRESSION_KIND[issue.kind][0].toUpperCase()}${IMPRESSION_KIND[issue.kind].slice(1)}. ${issue.reason}`,
      apply: () => fixImpression!(issue.find, issue.replace),
    }));
    const lineIssues = result.data.issues;
    const found = [
      ...organs,
      ...impression,
      ...lineIssues.filter((issue) => issue.kind === "continuity"),
      ...lineIssues.filter((issue) => issue.kind !== "continuity"),
    ];
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

  const apply = (issue: Issue) =>
    issue.apply ? issue.apply() : issue.remove ? issue.remove() : fixText(issue.line, issue.find, issue.replace);

  function fix(issue: Issue & { key: number }) {
    if (!apply(issue)) {
      toast.warning("That text has changed since the check, so it was left as it is.");
    }
    drop(issue.key);
  }

  function fixAll() {
    // Whole lines, the impression and normal findings are never changed in bulk: each is the doctor's own decision.
    const list = (issues ?? []).filter((issue) => !OWN_DECISION(issue));
    const kept = (issues ?? []).filter(OWN_DECISION);
    const done = list.filter(apply).length;
    setIssues(kept);
    onIssues(kept.length);
    if (done === list.length) toast.success(done === 1 ? "1 fix made" : `${done} fixes made`);
    else toast.warning(`${done} of ${list.length} fixes made. The rest of the text had changed.`);
    if (!kept.length) setOpen(false);
  }

  // Finalize asks for a check of the report as it is now.
  const lastRequest = useRef(checkRequest);
  useEffect(() => {
    if (checkRequest === lastRequest.current) return;
    lastRequest.current = checkRequest;
    // Started from a request outside the button, after this render.
    if (!checking) queueMicrotask(() => void check());
    // Only a new request starts a check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkRequest]);

  // Fix all covers only the wording suggestions.
  const bulk = (issues ?? []).filter((issue) => !OWN_DECISION(issue)).length;

  // Suggestions from the last check still waiting for Fix or Ignore.
  const pending = !checking && issues ? issues.length : 0;

  return (
    <Popover.Root open={open} onOpenChange={(next) => !checking && setOpen(next)}>
      <Tip label={validated ? "Validated. Press to check again · uses 1 AI update" : "Validate: check the impression against the findings, then spelling and grammar · uses 1 AI update"}>
        <Popover.Trigger
          onClick={(event) => {
            // Each press runs a fresh check of the report as it is now, rather than toggling.
            event.preventBaseUIHandler();
            if (!checking) check();
          }}
          disabled={disabled || checking}
          className={`${className} ${validated && !checking ? STEP_DONE : pending ? "font-bold text-amber-deep" : "font-bold text-ink"} data-[popup-open]:bg-surface`}
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
        <Popover.Positioner side={side} align="end" sideOffset={8} className="z-50">
          <Popover.Popup className="app-layer flex max-h-[min(34rem,calc(100dvh-8rem))] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-3xl border border-ink/20 bg-surface shadow-[0_18px_50px_-18px_rgb(6_17_15/0.45)] outline-none">
            <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-3.5">
              <Popover.Title className="text-[1.05rem] font-semibold">
                {checking
                  ? "Checking the report"
                  : issues && issues.length > 0
                    ? `${issues.length} suggestion${issues.length === 1 ? "" : "s"}`
                    : "Validation"}
              </Popover.Title>
              {bulk > 1 && (
                <button type="button" onClick={fixAll} className={`${SMALL} ml-auto bg-btn text-btn-text hover:bg-teal-deep`}>
                  Fix all
                </button>
              )}
              <Popover.Close
                aria-label="Close"
                className={`grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink ${
                  bulk > 1 ? "" : "ml-auto"
                }`}
              >
                <X weight="bold" className="h-4 w-4" />
              </Popover.Close>
            </div>

            {checking ? (
              <p className="flex items-center gap-2.5 px-5 py-6 text-ink-soft">
                <Spinner />
                Checking the impression against the findings, then spelling, grammar and filler words.
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
                      {issue.find ? (
                        <>
                          <span className="rounded bg-flag/10 px-1 text-flag line-through decoration-flag/60">{issue.find}</span>
                          <span aria-hidden="true" className="px-1.5 text-ink-quiet">
                            →
                          </span>
                        </>
                      ) : (
                        <span className="pr-1.5 font-semibold text-ink-soft">add</span>
                      )}
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
                        {!issue.find ? "Add" : issue.kind === "continuity" ? "Add back" : issue.replace ? "Fix" : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => drop(issue.key)}
                        className={`${SMALL} text-ink-soft hover:bg-ink/[0.06] hover:text-ink`}
                      >
                        {issue.kind === "impression" || issue.kind === "continuity" ? "Keep as written" : "Ignore"}
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
