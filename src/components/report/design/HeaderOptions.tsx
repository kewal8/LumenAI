"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  CaretRight,
  Check,
  Checks,
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
} from "@phosphor-icons/react";
import { useState } from "react";

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
            {stage === 4 ? "Copied for PACS" : stage === 3 ? "Copy again" : "Finalize & copy"}
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

function OptionTwoRows({ stage }: { stage: Stage }) {
  return (
    <Card>
      {/* Row 1: whose report, and the tools used rarely. Small and quiet. */}
      <div className="flex h-11 items-center gap-2 border-b border-line bg-ink/[0.02] px-4">
        <span className={QUIET_TOOL}><Plus weight="bold" className="h-[18px] w-[18px]" /></span>
        <span className="truncate text-[0.9rem] font-semibold">R. Sharma</span>
        <span className="shrink-0 text-[0.85rem] text-ink-soft">42 M</span>
        <span className="text-ink/25">/</span>
        <Template small />
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <span className={QUIET_TOOL}><Printer className="h-[18px] w-[18px]" /></span>
          <span className={QUIET_TOOL}><FloppyDisk className="h-[18px] w-[18px]" /></span>
          <span className={QUIET_TOOL}><CornersOut className="h-[18px] w-[18px]" /></span>
        </span>
      </div>
      {/* Row 2: the three closing steps, and where the report stands. */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[0.9rem] text-ink-soft">
          <Badge stage={stage} />
          <span className="truncate">
            {["Speak the findings", "Check it, then validate", "Ready to finalize", "Final. Copy it into PACS", "In your clipboard"][stage]}
          </span>
        </span>
        <Steps stage={stage} />
      </div>
      <FormatBar />
      <Paper />
    </Card>
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
    why: "The goal of the screen is text in PACS. Finalize and copy happen together in one press (⌘↵). Validate is the only other button, outlined because it is optional. Print, save and full screen go into ⋯.",
    cost: "Fewest presses and least on screen. Print is one more click away, which is a problem for centres that print every report.",
    View: OptionOnePress,
  },
  {
    key: "C",
    name: "Two rows: who, then what next",
    why: "A thin top row holds the patient, template and rare tools. A second row holds the closing steps with one line saying where the report stands.",
    cost: "Clearest to read, but about 48px less report on screen, and the doctor's eye is on the text, not the header.",
    View: OptionTwoRows,
  },
  {
    key: "D",
    name: "Dock where reading ends",
    why: "The header only says whose report it is. The closing steps float at the bottom of the report card, after the impression, where review finishes and near the AI Assistant's controls.",
    cost: "Very calm header, but a long report means scrolling to reach the dock unless it stays pinned to the bottom edge.",
    View: OptionDock,
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
