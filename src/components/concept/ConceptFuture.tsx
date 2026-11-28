"use client";

import {
  CaretDown,
  CheckCircle,
  Copy,
  FloppyDisk,
  Keyboard,
  List,
  Microphone,
  Printer,
  SidebarSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ReportEditor, type ReportEditorHandle } from "@/components/report/editor/ReportEditor";
import { applyPatch, reportFromTemplate, type PatchOp } from "@/lib/report";
import { reportToDoc } from "@/lib/reportDoc";
import { DEFAULT_PROFILE } from "@/lib/reportFormat";
import { CT_BRAIN_PLAIN } from "@/lib/templates";

// Made-up content, only to show the layout with realistic amounts of text.
const TALK = [
  {
    time: "1:02 pm",
    said: "Undisplaced fracture of the squamous part of right temporal bone, extending up to the external auditory canal.",
    reply: "Report created",
    detail: "1 line changed",
    check: false,
  },
  {
    time: "1:03 pm",
    said: "Soft tissue swelling in the right maxillary region measuring 16 mm.",
    reply: "Report updated",
    detail: "1 line changed",
    check: false,
  },
  {
    time: "1:04 pm",
    said: "Small extradural collection along the left temporal convexity.",
    reply: "1 line to check",
    detail: "The report says “right”. You said “left”.",
    check: true,
  },
];

const op = (values: Partial<PatchOp> & Pick<PatchOp, "op">): PatchOp => ({
  sectionId: "findings",
  lineId: "",
  text: "",
  source: "",
  warnings: [],
  ...values,
});

// The three dictations above, already written into the report.
const SAMPLE_REPORT = applyPatch(
  reportFromTemplate(CT_BRAIN_PLAIN),
  CT_BRAIN_PLAIN,
  [
    op({
      op: "replace",
      lineId: "findings.bones",
      text: "Undisplaced fracture of the squamous part of the right temporal bone, extending up to the external auditory canal.",
      source: TALK[0].said,
    }),
    op({
      op: "replace",
      lineId: "findings.soft-tissue",
      text: "Soft tissue swelling in the right maxillary region measuring 16 mm.",
      source: TALK[1].said,
    }),
    op({
      op: "replace",
      lineId: "findings.haemorrhage",
      text: "Small extradural collection along the right temporal convexity.",
      source: TALK[2].said,
      warnings: ["You said “left”. Check the side."],
    }),
  ],
  [
    "Undisplaced fracture of the squamous part of the right temporal bone.",
    "Small temporal extradural collection. Side to be confirmed.",
    "Right maxillary soft tissue swelling.",
  ],
);

// What pressing "Start speaking" pretends to hear, to show a dictation
// landing in the editor.
const NEXT_TURN = {
  time: "1:06 pm",
  said: "Mild mucosal thickening in the left maxillary sinus.",
  reply: "Report updated",
  detail: "1 line changed",
  check: false,
};
const NEXT_PLAN = {
  template: CT_BRAIN_PLAIN,
  ops: [
    op({
      op: "replace",
      lineId: "findings.sinuses",
      text: "Mild mucosal thickening in the left maxillary sinus. Mastoid air cells are clear.",
      source: NEXT_TURN.said,
    }),
  ],
  impression: [
    "Undisplaced fracture of the squamous part of the right temporal bone.",
    "Small temporal extradural collection. Side to be confirmed.",
    "Right maxillary soft tissue swelling.",
    "Mild left maxillary sinus mucosal thickening.",
  ],
};

// Both halves are the same kind of object: a white card on the grey canvas.
const CARD =
  "flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_1px_2px_rgb(10_13_12/0.05),0_22px_60px_-34px_rgb(10_13_12/0.4)]";
const ICON_BUTTON =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.08]";

export function ConceptFuture() {
  // The dictation panel can be folded away to give the report the whole screen.
  const [panel, setPanel] = useState(true);
  const initialDoc = useMemo(() => reportToDoc(SAMPLE_REPORT, DEFAULT_PROFILE), []);
  const editor = useRef<ReportEditorHandle>(null);
  // Whether the pretend fourth dictation has been played.
  const [played, setPlayed] = useState(false);
  const turns = played ? [...TALK, NEXT_TURN] : TALK;

  function pretendToDictate() {
    if (played) return;
    editor.current?.applyPatch(NEXT_PLAN);
    setPlayed(true);
  }

  return (
    <div className="app flex h-[100dvh] flex-1 flex-col overflow-hidden">
      {/* One slim bar: where you are, and nothing else. */}
      <header className="flex h-14 shrink-0 items-center gap-3 px-5">
        <button type="button" aria-label="Menu" className={ICON_BUTTON}>
          <List weight="bold" className="h-5 w-5" />
        </button>
        <Link href="/report" className="text-[1.2rem] font-bold tracking-[-0.04em]">
          Rad<span className="text-teal">matic</span>
        </Link>
        <span className="t-meta ml-3 hidden sm:inline">New report</span>
        <span className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.82rem] font-bold text-surface">
          DA
        </span>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 px-4 pb-4">
        {/* The report. */}
        <section aria-label="Report" className={`${CARD} min-w-0 flex-1`}>
          <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/30 px-4 text-[0.95rem] font-bold hover:bg-ink/[0.06]"
            >
              CT Brain (Plain)
              <CaretDown weight="bold" className="h-4 w-4" />
            </button>
            <span className="t-meta ml-2">Not saved yet</span>

            <span className="ml-auto flex items-center gap-1">
              <button type="button" aria-label="Save" title="Save" className={ICON_BUTTON}>
                <FloppyDisk weight="bold" className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Print or PDF" title="Print or PDF" className={ICON_BUTTON}>
                <Printer weight="bold" className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="ml-2 inline-flex h-11 items-center gap-2 rounded-full bg-teal px-5 text-[0.95rem] font-bold text-white hover:brightness-110"
              >
                <Copy weight="bold" className="h-5 w-5" />
                Copy report
              </button>
              <button
                type="button"
                onClick={() => setPanel((open) => !open)}
                aria-pressed={panel}
                aria-label={panel ? "Hide dictation" : "Show dictation"}
                title={panel ? "Hide dictation, for more room" : "Show dictation"}
                className={`${ICON_BUTTON} ml-1`}
              >
                <SidebarSimple weight={panel ? "fill" : "regular"} className="h-5 w-5 -scale-x-100" />
              </button>
            </span>
          </header>

          {/* The real report editor: every line can be edited and formatted. */}
          <ReportEditor ref={editor} variant="embedded" initialDoc={initialDoc} profile={DEFAULT_PROFILE} />
        </section>

        {/* Dictation: a conversation. The doctor's words on the right, what
            Radmatic did with them on the left. */}
        {panel && (
          <section aria-label="Dictation" className={`${CARD} w-full max-w-[27rem] shrink-0`}>
            <header className="flex items-center justify-between border-b border-line px-5 py-3">
              <h1 className="text-[1.3rem] font-bold tracking-[-0.02em]">Dictation</h1>
              <p className="inline-flex h-9 items-center gap-2 rounded-full bg-teal/[0.12] px-3.5 text-[0.9rem] font-bold text-teal-deep">
                <span className="h-2.5 w-2.5 rounded-full bg-teal" />
                Ready
              </p>
            </header>

            <ol className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-ink/[0.025] px-5 py-6">
              {turns.map((turn) => (
                <li key={turn.said} className="flex flex-col gap-2">
                  <p className="t-meta text-center">{turn.time}</p>

                  {/* What the doctor said. */}
                  <p className="ml-9 self-end rounded-[1.25rem] rounded-br-md bg-amber-tint px-4 py-3 text-[1.02rem] leading-snug text-ink shadow-[inset_0_0_0_1px_rgb(122_76_5/0.18)]">
                    {turn.said}
                  </p>

                  {/* What happened to the report. */}
                  <div className="mr-9 flex items-start gap-2.5 self-start">
                    <span
                      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${
                        turn.check ? "bg-flag" : "bg-teal"
                      }`}
                    >
                      {turn.check ? (
                        <WarningCircle weight="fill" className="h-[1.1rem] w-[1.1rem]" />
                      ) : (
                        <CheckCircle weight="fill" className="h-[1.1rem] w-[1.1rem]" />
                      )}
                    </span>
                    <p
                      className={`rounded-[1.25rem] rounded-tl-md border px-4 py-2.5 leading-snug ${
                        turn.check ? "border-flag/50 bg-flag/[0.08]" : "border-line bg-surface"
                      }`}
                    >
                      <span className={`block text-[0.98rem] font-bold ${turn.check ? "text-flag" : "text-ink"}`}>
                        {turn.reply}
                      </span>
                      <span className="block text-[0.92rem] text-ink-soft">{turn.detail}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* One box to speak or type into, like a message box. */}
            <div className="border-t border-line p-4">
              <div className="rounded-[1.5rem] border-2 border-ink/25 bg-surface p-2 transition-colors focus-within:border-teal">
                <p className="px-3 pb-8 pt-2 text-[1.02rem] text-ink-quiet">
                  Speak your findings, or type them here
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Type instead" title="Type instead" className={ICON_BUTTON}>
                    <Keyboard weight="bold" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={pretendToDictate}
                    disabled={played}
                    className="ml-auto inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-full bg-btn text-[1.05rem] font-bold text-btn-text transition-[background-color,transform] duration-150 hover:bg-teal-deep active:scale-[0.98] disabled:opacity-50"
                  >
                    <Microphone weight="fill" className="h-6 w-6" />
                    Start speaking
                  </button>
                </div>
              </div>
              <p className="t-meta mt-2.5 text-center">
                {played
                  ? "Sample finding added. Look at the sinuses line in the report."
                  : "Design sample: the button adds one made-up finding."}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
