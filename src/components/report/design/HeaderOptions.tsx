"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  Checks,
  Circle,
  Copy,
  CornersOut,
  DotsThree,
  Eraser,
  FloppyDisk,
  ListBullets,
  ListNumbers,
  Plus,
  Printer,
  SealCheck,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  TextUnderline,
  WarningCircle,
} from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { buttonClass } from "@/components/app/ui";

/*
 * A design study for the report header, built apart from the report screen so
 * nothing there changes. Each option is a static mock in the app's own tokens;
 * the stage switcher shows how emphasis moves as a report is finished.
 */

const STAGES = ["Dictating", "AI updated", "Validated", "Finalized", "Copied"] as const;
type Stage = 0 | 1 | 2 | 3 | 4;

const TOOL =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.07]";
const QUIET_TOOL =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink";
const PILL = "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[0.95rem] font-bold transition-colors";
const FILLED = `${PILL} bg-btn text-btn-text hover:bg-teal-deep`;
const OUTLINED = `${PILL} border border-ink/35 text-ink hover:bg-ink/[0.05]`;
const DONE = `${PILL} text-teal-deep`;
const WAITING = `${PILL} cursor-default bg-ink/[0.05] text-ink-quiet`;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container flex flex-col overflow-clip rounded-[28px] border border-line bg-surface shadow-[0_1px_2px_rgb(10_13_12/0.05),0_22px_60px_-34px_rgb(10_13_12/0.4)]">
      {children}
    </div>
  );
}

function Badge({ stage }: { stage: Stage }) {
  const final = stage >= 3;
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-px text-[0.68rem] font-bold uppercase tracking-[0.06em] ${
        final ? "bg-teal/[0.12] text-teal-deep" : "bg-ink/[0.07] text-ink-soft"
      }`}
    >
      {final ? "Final" : "Draft"}
    </span>
  );
}

function Template({ small }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-md px-1 font-medium text-ink-soft hover:bg-ink/[0.05] hover:text-ink ${
        small ? "text-[0.8rem]" : "text-[0.82rem]"
      }`}
    >
      <span className="truncate">MDCT BRAIN (TRAUMA)</span>
      <CaretDown className="h-3 w-3 shrink-0" />
    </span>
  );
}

/** Today's two-line label: the patient, then the state and template beneath. */
function Identity({ stage }: { stage: Stage }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col leading-tight">
      <span className="flex items-baseline gap-2">
        <span className="truncate text-[0.95rem] font-semibold">R. Sharma</span>
        <span className="shrink-0 text-[0.88rem] text-ink-soft">42 M</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <Badge stage={stage} />
        <Template />
      </span>
    </div>
  );
}

function FormatBar() {
  const icon = "h-[18px] w-[18px]";
  const tool = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink";
  const gap = <span className="mx-1 h-6 w-px shrink-0 bg-ink/15" />;
  return (
    <div className="flex items-center gap-0.5 overflow-hidden border-b border-line px-4 py-1.5 text-ink-soft">
      <span className={`${tool} text-ink-quiet`}>
        <ArrowCounterClockwise className={icon} />
      </span>
      <span className={`${tool} text-ink-quiet`}>
        <ArrowClockwise className={icon} />
      </span>
      {gap}
      <span className="flex h-9 w-36 shrink-0 items-center justify-between rounded-full bg-ink/[0.05] px-3.5 text-[0.9rem] font-medium text-ink">
        Arial <CaretDown className="h-3.5 w-3.5" />
      </span>
      <span className="ml-2 flex h-9 shrink-0 items-center gap-3 rounded-full bg-ink/[0.05] px-3 text-[0.9rem] font-medium text-ink">
        – 10 +
      </span>
      {gap}
      <span className={tool}><TextB className={icon} /></span>
      <span className={tool}><TextItalic className={icon} /></span>
      <span className={tool}><TextUnderline className={icon} /></span>
      {gap}
      <span className={`${tool} bg-teal/[0.12]`}><TextAlignLeft className={icon} /></span>
      <span className={tool}><TextAlignCenter className={icon} /></span>
      <span className={tool}><TextAlignRight className={icon} /></span>
      <span className={tool}><TextAlignJustify className={icon} /></span>
      {gap}
      <span className={tool}><ListBullets className={icon} /></span>
      <span className={tool}><ListNumbers className={icon} /></span>
      <span className={tool}><Eraser className={icon} /></span>
    </div>
  );
}

function Paper({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative px-10 pb-6 pt-6 font-[Arial,sans-serif] text-[0.9rem] leading-relaxed text-ink">
      <p className="text-center font-bold">MDCT BRAIN (TRAUMA)</p>
      <p className="mt-2">Plain slice MDCT scan of the brain was performed with 5 mm thick axial slices.</p>
      <p className="mt-1 font-bold">FINDINGS:</p>
      <p>Acute subdural haemorrhage over the right frontoparietal convexity, maximum thickness 10 mm.</p>
      <p className="mt-1 font-bold">IMPRESSION:</p>
      <p>Acute right frontoparietal subdural haemorrhage with mass effect.</p>
      {children}
    </div>
  );
}

// ——— Today ———

function Current({ stage }: { stage: Stage }) {
  return (
    <Card>
      <header className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className={TOOL}><Plus weight="bold" className="h-5 w-5" /></span>
        <Identity stage={stage} />
        <div className="flex shrink-0 items-center gap-1">
          <span className={TOOL}><Printer weight="bold" className="h-5 w-5" /></span>
          <span className={TOOL}><Copy weight="bold" className="h-5 w-5" /></span>
          <span className="mx-1 h-6 w-px bg-ink/20" />
          <span className={TOOL}><FloppyDisk weight="bold" className="h-5 w-5" /></span>
          <span className={TOOL}><Checks weight="bold" className="h-5 w-5" /></span>
          <span className={stage >= 1 ? FILLED : WAITING}>
            <SealCheck weight={stage >= 3 ? "fill" : "bold"} className="h-5 w-5" />
            <span className="hidden @[40rem]:inline">{stage >= 3 ? "Finalized" : "Finalize"}</span>
          </span>
          <span className="mx-1 h-6 w-px bg-ink/20" />
          <span className={TOOL}><CornersOut weight="bold" className="h-5 w-5" /></span>
        </div>
      </header>
      <FormatBar />
      <Paper />
    </Card>
  );
}

// ——— A. Steps ———

/** The three closing steps as one path: done ones ticked, the next one filled. */
function Steps({ stage, size = "md" }: { stage: Stage; size?: "md" | "lg" }) {
  const steps = [
    { label: "Validate", icon: Checks },
    { label: "Finalize", icon: SealCheck },
    { label: stage === 4 ? "Copied" : "Copy", icon: Copy },
  ];
  // Stage 1 → step 0 is next, 2 → step 1, 3 → step 2; 4 → all done.
  const next = stage === 0 ? -1 : stage - 1;
  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const done = stage >= 2 + index;
        const className = done
          ? DONE
          : index === next
            ? FILLED
            : stage === 0 && index < 2
              ? WAITING
              : OUTLINED;
        const Icon = done ? Check : step.icon;
        return (
          <span key={step.label} className="flex items-center">
            {index > 0 && <CaretRight weight="bold" className="mx-0.5 h-3.5 w-3.5 text-ink/30" />}
            <span className={`${className} ${size === "lg" ? "!h-11 !px-5" : ""}`}>
              <Icon weight="bold" className="h-[18px] w-[18px]" />
              <span className={index === next || size === "lg" ? "" : "hidden @[46rem]:inline"}>{step.label}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function OptionSteps({ stage }: { stage: Stage }) {
  return (
    <Card>
      <header className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className={TOOL}><Plus weight="bold" className="h-5 w-5" /></span>
        <Identity stage={stage} />
        <div className="flex shrink-0 items-center gap-0.5">
          <span className={QUIET_TOOL}><Printer className="h-5 w-5" /></span>
          <span className={QUIET_TOOL}><FloppyDisk className="h-5 w-5" /></span>
          <span className={QUIET_TOOL}><CornersOut className="h-5 w-5" /></span>
          <span className="mx-2 h-6 w-px bg-ink/20" />
          <Steps stage={stage} />
        </div>
      </header>
      <FormatBar />
      <Paper />
    </Card>
  );
}

// ——— B. One press ———

function OptionOnePress({ stage }: { stage: Stage }) {
  return (
    <Card>
      <header className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className={TOOL}><Plus weight="bold" className="h-5 w-5" /></span>
        <Identity stage={stage} />
        <div className="flex shrink-0 items-center gap-2">
          <span className={stage >= 2 ? DONE : stage === 0 ? WAITING : OUTLINED}>
            {stage >= 2 ? <Check weight="bold" className="h-[18px] w-[18px]" /> : <Checks weight="bold" className="h-[18px] w-[18px]" />}
            <span className="hidden @[36rem]:inline">{stage >= 2 ? "Validated" : "Validate"}</span>
          </span>
          <span className={stage === 0 ? WAITING : stage === 4 ? DONE : FILLED}>
            {stage === 4 ? <Check weight="bold" className="h-[18px] w-[18px]" /> : <SealCheck weight="bold" className="h-[18px] w-[18px]" />}
            {stage === 4 ? "Copied" : stage === 3 ? "Copy again" : "Finalize & copy"}
            {stage > 0 && stage < 3 && <kbd className="ml-1 hidden font-[inherit] text-[0.8rem] font-semibold opacity-60 @[40rem]:inline">⌘↵</kbd>}
          </span>
          <span className={TOOL}><DotsThree weight="bold" className="h-5 w-5" /></span>
        </div>
      </header>
      <FormatBar />
      <Paper />
    </Card>
  );
}

// ——— C. Two rows ———

const DEMO_ISSUES = [
  { id: "spelling", kind: "Spelling", text: "“haemorrage” should be “haemorrhage”", where: "Findings, line 2" },
  { id: "filler", kind: "Filler word", text: "“um” was left in the sentence", where: "Findings, line 4" },
];

/** One step of the Validate and Finalize pair: an empty ring until done, then a green tick and less weight. */
function StepButton({
  done,
  busy,
  attention,
  label,
  title,
  onClick,
  disabled,
}: {
  done: boolean;
  busy?: boolean;
  /** Something needs the doctor before this step counts as done. */
  attention?: boolean;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const icon = "h-[18px] w-[18px] shrink-0";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.92rem] transition-colors hover:bg-surface active:scale-[0.98] disabled:cursor-progress ${
        done
          ? "font-medium text-ink-soft hover:text-ink"
          : attention
            ? "font-bold text-amber-deep"
            : "font-bold text-ink"
      }`}
    >
      {busy ? (
        <Spinner />
      ) : done ? (
        <CheckCircle weight="fill" className={`${icon} text-teal`} />
      ) : attention ? (
        <WarningCircle weight="fill" className={icon} />
      ) : (
        <Circle weight="bold" className={`${icon} text-ink-quiet`} />
      )}
      {label}
    </button>
  );
}

/**
 * A working prototype. The second row names the report and shows its two
 * states as tags; Validate and Finalize are a pair of steps that each go from
 * an empty ring to a green tick, and Copy stands apart from them. Validate is
 * optional and lists what it finds; Finalize asks first when the report has
 * not been validated, and a finalized report can be opened again.
 */
function OptionTwoRows() {
  const [validated, setValidated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<typeof DEMO_ISSUES>([]);
  const [final, setFinal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState<"finalize" | "reopen" | null>(null);
  // Prototype only: makes the next validation find mistakes.
  const [mistakes, setMistakes] = useState(false);

  // Stands in for the real check, which takes a few seconds.
  function validate(then?: () => void) {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (mistakes) {
        setValidated(false);
        setIssues(DEMO_ISSUES);
        toast.warning(`Validation found ${DEMO_ISSUES.length} things to fix`);
        return;
      }
      setIssues([]);
      setValidated(true);
      toast.success("Validated. No issues found.");
      then?.();
    }, 1100);
  }

  function fix(ids: string[]) {
    const left = issues.filter((issue) => !ids.includes(issue.id));
    setIssues(left);
    if (!left.length) {
      setValidated(true);
      toast.success("All fixed. Report validated.");
    }
  }

  function finalize() {
    setFinal(true);
    toast.success("Report finalized and saved");
  }

  function copy() {
    setCopied(true);
    toast.success(validated ? "Validated report copied" : "Report copied");
  }

  function reset() {
    setValidated(false);
    setChecking(false);
    setIssues([]);
    setFinal(false);
    setCopied(false);
  }

  const TAG = "shrink-0 rounded px-1.5 py-px text-[0.68rem] font-bold uppercase tracking-[0.06em]";

  return (
    <Card>
      {/* Row 1: whose report, where it stands, and the tools used rarely. Small and quiet. */}
      <div className="flex h-11 items-center gap-2 border-b border-line bg-ink/[0.02] px-4">
        <span className={QUIET_TOOL}><Plus weight="bold" className="h-[18px] w-[18px]" /></span>
        <span className="truncate text-[0.9rem] font-semibold">R. Sharma</span>
        <span className="shrink-0 text-[0.85rem] text-ink-soft">42 M</span>
        {/* Where the report stands, beside whose it is. */}
        <span className="ml-1 flex shrink-0 items-center gap-1.5">
          <span className={`${TAG} ${final ? "bg-teal/[0.12] text-teal-deep" : "bg-ink/[0.07] text-ink-soft"}`}>
            {final ? "Final" : "Draft"}
          </span>
          <span
            className={`${TAG} ${
              validated
                ? "bg-teal/[0.12] text-teal-deep"
                : issues.length
                  ? "bg-amber-tint text-amber-deep"
                  : "bg-ink/[0.07] text-ink-soft"
            }`}
          >
            {validated ? "Validated" : issues.length ? `${issues.length} to fix` : "Not validated"}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <span className={QUIET_TOOL}><Printer className="h-[18px] w-[18px]" /></span>
          <span className={QUIET_TOOL}><FloppyDisk className="h-[18px] w-[18px]" /></span>
          <span className={QUIET_TOOL}><CornersOut className="h-[18px] w-[18px]" /></span>
        </span>
      </div>
      {/* Row 2: the template, then the pair of steps, then Copy on its own. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
        {/* Starts on the same line as the + above and the undo arrow below: their icons sit 9px inside their buttons. */}
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-2 pl-[5px]">
          <Template />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* One family: two steps on a shared track. */}
          <div className="flex items-center gap-0.5 rounded-full bg-ink/[0.05] p-0.5">
            <StepButton
              done={validated}
              busy={checking}
              attention={issues.length > 0}
              label={checking ? "Validating" : validated ? "Validated" : issues.length ? `${issues.length} to fix` : "Validate"}
              title={validated || issues.length ? "Validate again" : "Check spelling, grammar and filler words"}
              onClick={() => validate()}
              disabled={checking}
            />
            <StepButton
              done={final}
              label={final ? "Finalized" : "Finalize"}
              title={final ? "Open this report for changes" : "Mark this report final"}
              onClick={() => (final ? setAsking("reopen") : validated ? finalize() : setAsking("finalize"))}
              disabled={checking}
            />
          </div>

          <span aria-hidden="true" className="h-6 w-px bg-ink/15" />

          {/* On its own: works at any time. */}
          <button type="button" onClick={copy} className={OUTLINED}>
            {copied ? <Check weight="bold" className="h-[18px] w-[18px]" /> : <Copy weight="bold" className="h-[18px] w-[18px]" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* What validation found, each with its place in the report. The last fix marks the report validated. */}
      {issues.length > 0 && (
        <div className="border-b border-line bg-amber-tint/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[0.92rem] font-bold text-amber-deep">
              {issues.length === 1 ? "1 thing to fix" : `${issues.length} things to fix`}
            </p>
            {issues.length > 1 && (
              <button
                type="button"
                onClick={() => fix(issues.map((issue) => issue.id))}
                className="text-[0.88rem] font-bold text-ink underline-offset-2 hover:underline"
              >
                Fix all
              </button>
            )}
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                <span className="min-w-0 flex-1 text-[0.92rem]">
                  <span className="font-bold">{issue.kind}: </span>
                  {issue.text}
                  <span className="block text-[0.82rem] text-ink-soft">{issue.where}</span>
                </span>
                <button
                  type="button"
                  onClick={() => fix([issue.id])}
                  className="inline-flex h-9 shrink-0 items-center rounded-full border border-ink/35 px-3.5 text-[0.88rem] font-bold hover:bg-ink/[0.05]"
                >
                  Fix
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormatBar />
      <Paper>
        <div className="mt-5 flex flex-wrap items-center gap-4 font-sans">
          <label className="flex items-center gap-2.5 text-[0.85rem] font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={mistakes}
              onChange={(event) => setMistakes(event.target.checked)}
              className="h-4 w-4 accent-teal"
            />
            Prototype: the report has mistakes
          </label>
          <button type="button" onClick={reset} className="text-[0.85rem] font-semibold text-ink-quiet underline-offset-2 hover:text-ink hover:underline">
            Reset
          </button>
        </div>
      </Paper>

      <Dialog.Root open={asking !== null} onOpenChange={(open) => !open && setAsking(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            {asking === "reopen" ? (
              <>
                <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Open this report for changes?</Dialog.Title>
                <Dialog.Description className="mt-2 text-ink-soft">
                  It goes back to Draft. Finalize it again when the changes are done.
                </Dialog.Description>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAsking(null);
                      setFinal(false);
                      toast.warning("Report is a draft again");
                    }}
                    className={buttonClass.primary}
                  >
                    Open for changes
                  </button>
                  <Dialog.Close className={buttonClass.quiet}>Keep it final</Dialog.Close>
                </div>
              </>
            ) : issues.length ? (
              <>
                <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Finalize with {issues.length} left to fix?</Dialog.Title>
                <Dialog.Description className="mt-2 text-ink-soft">
                  Validation found mistakes that are still in the report.
                </Dialog.Description>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Dialog.Close className={buttonClass.primary}>Go back and fix</Dialog.Close>
                  <button
                    type="button"
                    onClick={() => {
                      setAsking(null);
                      finalize();
                    }}
                    className={buttonClass.secondary}
                  >
                    Finalize anyway
                  </button>
                </div>
              </>
            ) : (
              <>
                <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Validate before finalizing?</Dialog.Title>
                <Dialog.Description className="mt-2 text-ink-soft">
                  This report has not been validated. Validate checks spelling, grammar and filler words, and uses 1 AI update.
                </Dialog.Description>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAsking(null);
                      validate(finalize);
                    }}
                    className={buttonClass.primary}
                  >
                    <Checks weight="bold" className="h-4 w-4" />
                    Validate, then finalize
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAsking(null);
                      finalize();
                    }}
                    className={buttonClass.secondary}
                  >
                    Finalize without validating
                  </button>
                  <Dialog.Close className={buttonClass.quiet}>Cancel</Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}

// ——— E. No Finalize: the hand-off marks it done ———

/**
 * A working prototype with no Save and no Finalize. The draft saves itself;
 * Validate stays optional; copying or printing is the hand-off and marks the
 * report done, and a change after that is flagged. With "Approval step" on,
 * as in a centre where a senior signs off others' reports, an Approve button
 * appears and is the only thing that releases the report.
 */
function OptionHandOff() {
  const [approvals, setApprovals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState<{ how: "Copied" | "Printed"; at: string } | null>(null);
  const [changedAfter, setChangedAfter] = useState(false);
  const [approved, setApproved] = useState(false);

  const now = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  // Every change saves itself a moment later; no Save button.
  function edit() {
    setSaving(true);
    setValidated(false);
    if (sent) setChangedAfter(true);
    if (approved) setApproved(false);
    setTimeout(() => setSaving(false), 700);
  }

  function validate() {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setValidated(true);
      toast.success("Validated. Nothing to fix.");
    }, 1100);
  }

  function handOff(how: "Copied" | "Printed") {
    if (approvals && !approved) {
      toast.warning("This report needs approval before it can be copied or printed.");
      return;
    }
    setSent({ how, at: now() });
    setChangedAfter(false);
    toast.success(how === "Copied" ? "Report copied" : "Sent to the printer");
  }

  function reset() {
    setSaving(false);
    setValidated(false);
    setChecking(false);
    setSent(null);
    setChangedAfter(false);
    setApproved(false);
  }

  const state = changedAfter
    ? { label: `Changed after ${sent!.how === "Copied" ? "copying" : "printing"}`, tone: "bg-amber-tint text-amber-deep" }
    : sent
      ? { label: `${sent.how} ${sent.at}`, tone: "bg-teal/[0.12] text-teal-deep" }
      : approved
        ? { label: "Approved", tone: "bg-teal/[0.12] text-teal-deep" }
        : { label: "Draft", tone: "bg-ink/[0.07] text-ink-soft" };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-3 self-start rounded-full border border-line bg-surface px-4 py-2 text-[0.9rem] font-semibold">
        <input type="checkbox" checked={approvals} onChange={(event) => (setApprovals(event.target.checked), reset())} className="h-4 w-4 accent-teal" />
        Approval step: a senior signs off before release
      </label>
      <Card>
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2">
          <span className={TOOL}><Plus weight="bold" className="h-5 w-5" /></span>
          <div className="flex min-w-0 flex-1 basis-48 flex-col leading-tight">
            <span className="flex items-baseline gap-2">
              <span className="truncate text-[0.95rem] font-semibold">R. Sharma</span>
              <span className="shrink-0 text-[0.88rem] text-ink-soft">42 M</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`shrink-0 rounded px-1.5 py-px text-[0.68rem] font-bold uppercase tracking-[0.06em] ${state.tone}`}>
                {state.label}
              </span>
              {/* The save state is a quiet word, not a button. */}
              <span className="text-[0.8rem] text-ink-quiet">{saving ? "Saving…" : "Saved"}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => handOff("Printed")} title="Print or PDF" className={QUIET_TOOL}>
              <Printer className="h-5 w-5" />
            </button>
            {validated && !checking ? (
              <button type="button" onClick={validate} title="Validate again" className={`${PILL} bg-teal/[0.12] text-teal-deep hover:bg-teal/[0.18]`}>
                <CheckCircle weight="fill" className="h-[18px] w-[18px]" />
                Validated
              </button>
            ) : (
              <button type="button" onClick={validate} disabled={checking} className={`${OUTLINED} disabled:opacity-60`}>
                {checking ? <Spinner /> : <Checks weight="bold" className="h-[18px] w-[18px]" />}
                {checking ? "Validating" : "Validate"}
              </button>
            )}
            {approvals && (
              <button
                type="button"
                onClick={() => (setApproved(true), toast.success("Report approved and released"))}
                disabled={approved}
                className={approved ? `${PILL} text-teal-deep` : OUTLINED}
              >
                <SealCheck weight={approved ? "fill" : "bold"} className="h-[18px] w-[18px]" />
                {approved ? "Approved" : "Approve"}
              </button>
            )}
            <button type="button" onClick={() => handOff("Copied")} className={FILLED}>
              <Copy weight="bold" className="h-[18px] w-[18px]" />
              Copy report
            </button>
          </div>
        </header>
        <FormatBar />
        <Paper>
          <div className="mt-5 flex flex-wrap gap-3 font-sans">
            <button
              type="button"
              onClick={edit}
              className="rounded-full border border-dashed border-ink/30 px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink-soft hover:border-ink/60 hover:text-ink"
            >
              Make an edit to the report
            </button>
            <button type="button" onClick={reset} className="text-[0.85rem] font-semibold text-ink-quiet underline-offset-2 hover:text-ink hover:underline">
              Reset
            </button>
          </div>
        </Paper>
      </Card>
    </div>
  );
}

// ——— D. Dock at the end ———

function OptionDock({ stage }: { stage: Stage }) {
  return (
    <Card>
      <header className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className={TOOL}><Plus weight="bold" className="h-5 w-5" /></span>
        <Identity stage={stage} />
        <div className="flex shrink-0 items-center gap-0.5">
          <span className={QUIET_TOOL}><Printer className="h-5 w-5" /></span>
          <span className={QUIET_TOOL}><FloppyDisk className="h-5 w-5" /></span>
          <span className={QUIET_TOOL}><CornersOut className="h-5 w-5" /></span>
        </div>
      </header>
      <FormatBar />
      <Paper>
        {/* Sits at the bottom of the report card, where reading ends. */}
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1.5 font-sans shadow-[0_14px_40px_-16px_rgb(10_13_12/0.45)]">
            <Steps stage={stage} size="lg" />
          </div>
        </div>
      </Paper>
    </Card>
  );
}

const OPTIONS = [
  {
    key: "A",
    name: "Steps in the header",
    why: "Validate, Finalize and Copy become one path. Done steps get a tick, the next one is the only filled button, so the eye always lands on what to press. Print, save and full screen drop to quiet icons on the far side of a divider.",
    cost: "Three buttons stay visible. On a narrow screen the done and later steps shrink to icons.",
    View: OptionSteps,
  },
  {
    key: "B",
    name: "Finalize & copy, one press",
    why: "The goal of the screen is a report ready to paste. Finalize and copy happen together in one press (⌘↵). Validate is the only other button, outlined because it is optional. Print, save and full screen go into ⋯.",
    cost: "Fewest presses and least on screen. Print is one more click away, which is a problem for centres that print every report.",
    View: OptionOnePress,
  },
  {
    key: "C",
    name: "Two rows: who, then the report and its steps",
    why: "A thin top row holds the patient, the report's two tags (Draft and Not validated) and the rare tools. The second row names the template. Validate and Finalize are one pair: an empty ring until done, then a green tick and less weight. Copy stands apart and works at any time. Try it: tick “the report has mistakes” below the report to see validation list what it found.",
    cost: "Clearest to read, but about 48px less report on screen.",
    View: OptionTwoRows,
  },
  {
    key: "D",
    name: "Dock where reading ends",
    why: "The header only says whose report it is. The closing steps float at the bottom of the report card, after the impression, where review finishes and near the AI Assistant's controls.",
    cost: "Very calm header, but a long report means scrolling to reach the dock unless it stays pinned to the bottom edge.",
    View: OptionDock,
  },
  {
    key: "E",
    name: "No Finalize: copying or printing marks it done",
    why: "No Save and no Finalize. The draft saves itself. Validate stays optional. Copy or Print is the hand-off, so it marks the report done with the time; an edit after that is flagged in amber and switches Validated off. Turn on the approval step to see a centre where a senior must approve first. Try it: these buttons work.",
    cost: "Two buttons in the header. A report copied just to check the paste counts as sent until it is changed.",
    View: OptionHandOff,
  },
];

export function HeaderOptions() {
  const [stage, setStage] = useState<Stage>(1);
  const [narrow, setNarrow] = useState(false);
  const segment = (active: boolean) =>
    `h-9 rounded-full px-3.5 text-[0.88rem] font-semibold transition-colors ${
      active ? "bg-btn text-btn-text" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
    }`;

  return (
    <main className="mx-auto flex w-full max-w-[76rem] flex-col gap-8 px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">Report header options</h1>
        <p className="max-w-[70ch] text-ink-soft">
          A design study. The report screen is unchanged. Move through the stages to see where emphasis goes as a
          report is closed out.
        </p>
      </div>

      <div className="sticky top-3 z-10 flex flex-wrap items-center gap-3 self-start rounded-full border border-line bg-surface p-1.5 shadow-[0_10px_30px_-18px_rgb(10_13_12/0.4)]">
        <div className="flex flex-wrap gap-0.5">
          {STAGES.map((label, index) => (
            <button key={label} type="button" onClick={() => setStage(index as Stage)} className={segment(stage === index)}>
              {label}
            </button>
          ))}
        </div>
        <span className="h-6 w-px bg-ink/15" />
        <div className="flex gap-0.5">
          <button type="button" onClick={() => setNarrow(false)} className={segment(!narrow)}>
            Wide
          </button>
          <button type="button" onClick={() => setNarrow(true)} className={segment(narrow)}>
            Beside assistant
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.05rem] font-semibold">Today</h2>
        <div className={narrow ? "max-w-[40rem]" : ""}>
          <Current stage={stage} />
        </div>
      </section>

      {OPTIONS.map(({ key, name, why, cost, View }) => (
        <section key={key} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-[1.05rem] font-semibold">
              <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.85rem] text-surface">{key}</span>
              {name}
            </h2>
            <p className="max-w-[80ch] text-[0.95rem] text-ink-soft">{why}</p>
            <p className="max-w-[80ch] text-[0.9rem] text-ink-quiet">{cost}</p>
          </div>
          <div className={narrow ? "max-w-[40rem]" : ""}>
            <View stage={stage} />
          </div>
        </section>
      ))}
    </main>
  );
}
