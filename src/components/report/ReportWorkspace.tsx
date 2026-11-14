"use client";

import {
  CheckCircle,
  Copy,
  Info,
  Microphone,
  PencilSimpleLine,
  Plus,
  Stop,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { copyReport } from "@/lib/clipboard";
import {
  applyPatch,
  reportFromTemplate,
  type PatchOp,
  type Report,
  type Template,
} from "@/lib/report";
import {
  buildReportHtml,
  buildReportText,
  type FormattedReport,
  type PasteProfile,
} from "@/lib/reportFormat";
import { Select } from "@/components/app/ui";
import { MICROPHONE_MESSAGES, useDictation } from "@/lib/useDictation";

type Message = { dictation: string; changed: number; flagged: number };
type CopyState = "empty" | "copied" | "stale";

function formatted(report: Report): FormattedReport {
  return {
    title: report.title,
    sections: [
      ...report.sections.map((section) => ({
        heading: section.heading,
        lines: section.lines.map((line) => line.text),
      })),
      { heading: "IMPRESSION", lines: report.impression },
    ],
  };
}

const COPY_BLOCKED =
  "The report is ready, but your browser did not let it copy by itself. Press Copy report, then paste into PACS.";

function toBlob(text: string, type: string) {
  return new Blob([text], { type });
}

export function ReportWorkspace({
  profile,
  templates,
}: {
  profile: PasteProfile;
  templates: Template[];
}) {
  const [template, setTemplate] = useState(templates[0]);
  const [report, setReport] = useState(() => reportFromTemplate(templates[0]));
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraftState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("empty");

  // Mirrors of state for callbacks that outlive a render (speech socket, timers).
  const reportRef = useRef(report);
  useEffect(() => {
    reportRef.current = report;
  });
  // Written directly so the last spoken words are readable the moment the
  // speech connection closes, before React has re-rendered.
  const draftRef = useRef("");
  function setDraft(text: string) {
    draftRef.current = text;
    setDraftState(text);
  }

  const dictation = useDictation({
    model: "nova-3-medical",
    language: "en-IN",
    keyterms: [],
    onWords: (words) =>
      setDraft(
        [draftRef.current, words.map((word) => word.text).join(" ")]
          .filter(Boolean)
          .join(" "),
      ),
  });

  const started = messages.length > 0 || copyState !== "empty";

  function newCase(next = template) {
    if (started && !window.confirm("Start a new case? The current report will be cleared.")) {
      return;
    }
    setTemplate(next);
    setReport(reportFromTemplate(next));
    setMessages([]);
    setDraft("");
    setError("");
    setCopyState("empty");
  }

  async function copy(next: Report) {
    const output = formatted(next);
    try {
      await copyReport(buildReportHtml(output, profile), buildReportText(output, profile));
      setCopyState("copied");
    } catch {
      setCopyState("stale");
      setError(COPY_BLOCKED);
    }
  }

  async function generate(text: string): Promise<Report> {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template,
        report: reportRef.current,
        dictation: text,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);

    const ops: PatchOp[] = body.ops;
    const next = applyPatch(reportRef.current, template, ops, body.impression);
    setReport(next);
    setMessages((previous) => [
      ...previous,
      {
        dictation: text,
        changed: ops.length,
        flagged: ops.filter((op) => op.warnings.length > 0).length,
      },
    ]);
    return next;
  }

  // Must be called from a click or key press. The clipboard write starts now,
  // while the browser still counts it as user-initiated, and is filled in when
  // the report arrives a few seconds later.
  async function send(textPromise: Promise<string>) {
    setBusy(true);
    setError("");
    setCopyState("stale");

    const nextReport = textPromise.then(async (text) => {
      if (!text.trim()) throw new Error("Nothing was dictated.");
      const next = await generate(text.trim());
      setDraft("");
      return next;
    });
    const output = nextReport.then(formatted);

    const copied = navigator.clipboard
      .write([
        new ClipboardItem({
          "text/html": output.then((value) =>
            toBlob(buildReportHtml(value, profile), "text/html"),
          ),
          "text/plain": output.then((value) =>
            toBlob(buildReportText(value, profile), "text/plain"),
          ),
        }),
      ])
      .then(
        () => true,
        () => false,
      );

    try {
      await nextReport;
      const done = await copied;
      setCopyState(done ? "copied" : "stale");
      if (!done) setError(COPY_BLOCKED);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the report.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (!dictation.recording) {
      dictation.start();
      return;
    }
    // Stop, wait for the last words, then update the report in one step.
    send(dictation.stop().then(() => draftRef.current));
  }

  // Typed edits: recopy shortly after the radiologist stops typing.
  const editTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function edited(next: Report) {
    setReport(next);
    setCopyState("stale");
    clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => copy(next), 500);
  }

  function editLine(sectionId: string, lineId: string, text: string) {
    edited({
      ...report,
      sections: report.sections.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              lines: section.lines.map((line) =>
                line.id !== lineId
                  ? line
                  : { ...line, text, status: "edited", warnings: [] },
              ),
            },
      ),
    });
  }

  const flaggedLines = report.sections
    .flatMap((section) => section.lines)
    .filter((line) => line.warnings.length > 0).length;

  const status = dictation.recording
    ? "listening"
    : dictation.starting
      ? "starting"
      : busy
        ? "writing"
        : "ready";

  // Report text looks like plain text until it is hovered or clicked into.
  const lineClass =
    "block w-full resize-none rounded-lg border border-transparent bg-transparent px-2.5 py-1 text-ink outline-none transition-colors [field-sizing:content] hover:border-ink focus:border-teal focus:bg-surface";

  // On a laptop the workspace is exactly one screen tall: the report scrolls
  // inside its column and the dictation panel never moves.
  return (
    <main className="flex min-w-0 flex-1 flex-col lg:h-[100dvh] lg:flex-none lg:flex-row lg:overflow-hidden">
      {/* The report: what will be pasted into PACS. */}
      <section className="order-2 flex min-w-0 flex-1 flex-col lg:order-1 lg:overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3 sm:px-8">
          <label className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
            Template
            <Select
              value={template.id}
              onChange={(event) => newCase(templates.find((item) => item.id === event.target.value))}
              className="max-w-[16rem]"
            >
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <button
            type="button"
            onClick={() => newCase()}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/65 px-4 text-[0.95rem] font-semibold transition-colors hover:border-ink hover:bg-ink/[0.04]"
          >
            <Plus weight="bold" className="h-4 w-4" />
            New case
          </button>

          <div className="ml-auto flex items-center gap-3 whitespace-nowrap" aria-live="polite">
            {copyState === "copied" ? (
              <button
                type="button"
                onClick={() => copy(report)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-teal px-5 text-[0.95rem] font-bold text-white"
              >
                <CheckCircle weight="fill" className="h-5 w-5" />
                Copied. Press Ctrl+V
              </button>
            ) : (
              <button
                type="button"
                onClick={() => copy(report)}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-btn px-5 text-[0.95rem] font-bold text-btn-text transition-colors hover:bg-teal-deep disabled:opacity-50"
              >
                <Copy weight="bold" className="h-5 w-5" />
                Copy report
              </button>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 px-4 py-6 sm:px-8 lg:overflow-y-auto">
          <div className="mx-auto flex max-w-[52rem] flex-col gap-4">
            {flaggedLines > 0 && (
              <p
                role="alert"
                className="flex items-center gap-2.5 rounded-2xl border border-flag/50 bg-flag/10 px-4 py-3 font-semibold text-flag"
              >
                <WarningCircle weight="fill" className="h-5 w-5 shrink-0" />
                {flaggedLines} {flaggedLines === 1 ? "line needs" : "lines need"} checking before
                you sign.
              </p>
            )}

            {/* Set in Arial, as the PACS editor will show it. */}
            <article className="rounded-3xl border border-ink/45 bg-surface px-5 py-7 font-[Arial,Helvetica,sans-serif] text-[0.95rem] leading-[1.6] tracking-normal text-ink shadow-[0_1px_2px_rgb(15_38_36/0.06)] sm:px-9 sm:py-9">
              <h1 className="text-center text-[1.05rem] font-bold">{report.title}</h1>

              {report.sections.map((section) => (
                <div key={section.id} className="mt-6">
                  <h2 className="px-2.5 font-bold">{section.heading}:</h2>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {section.lines.map((line) => {
                      const changed = line.status !== "normal";
                      const flagged = line.warnings.length > 0;
                      return (
                        <li
                          key={line.id}
                          className={`rounded-xl ${
                            flagged
                              ? "bg-flag/10 ring-1 ring-flag/50"
                              : changed
                                ? "bg-teal/[0.09] ring-1 ring-teal/30"
                                : ""
                          }`}
                        >
                          <textarea
                            value={line.text}
                            onChange={(event) => editLine(section.id, line.id, event.target.value)}
                            rows={Math.max(1, Math.ceil(line.text.length / 88))}
                            aria-label={`${section.heading} line`}
                            className={`${lineClass} ${changed ? "font-bold" : ""}`}
                          />
                          {(line.source || flagged) && (
                            <div className="px-2.5 pb-2 font-[family-name:var(--font-brand)] text-[0.85rem] leading-snug">
                              {line.warnings.map((warning) => (
                                <p key={warning} className="flex items-start gap-1.5 font-semibold text-flag">
                                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                                  {warning}
                                </p>
                              ))}
                              {line.source && (
                                <p className="text-ink-soft">You said: “{line.source}”</p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <div className="mt-6">
                <h2 className="px-2.5 font-bold">IMPRESSION:</h2>
                <textarea
                  value={report.impression.join("\n")}
                  onChange={(event) =>
                    edited({ ...report, impression: event.target.value.split("\n") })
                  }
                  rows={Math.max(1, report.impression.length)}
                  aria-label="Impression"
                  className={`${lineClass} mt-1.5 ${started ? "font-bold" : ""}`}
                />
              </div>
            </article>

            <p className="flex items-center justify-center gap-2 pb-2 text-[0.92rem] font-semibold text-ink-soft">
              <PencilSimpleLine className="h-4 w-4" />
              Click any line to change it by hand.
            </p>
          </div>
        </div>
      </section>

      {/* Dictation: always in view on a laptop screen, beside the report. */}
      <aside
        aria-label="Dictation"
        className="order-1 flex shrink-0 flex-col border-b border-line bg-surface lg:order-2 lg:h-full lg:w-[25rem] lg:border-b-0 lg:border-l xl:w-[27rem]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 lg:h-[4.25rem]">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">Dictation</h2>
          <p
            role="status"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.9rem] font-bold ${
              status === "listening"
                ? "bg-flag text-white"
                : status === "ready"
                  ? "border border-ink/50 bg-surface text-ink"
                  : "bg-amber/25 text-amber-deep"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                status === "listening"
                  ? "animate-pulse bg-white"
                  : status === "ready"
                    ? "bg-teal"
                    : "animate-pulse bg-amber"
              }`}
            />
            {status === "listening" && "Listening"}
            {status === "starting" && "Starting"}
            {status === "writing" && "Writing report"}
            {status === "ready" && "Ready"}
          </p>
        </header>

        <div className="flex max-h-56 min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 lg:max-h-none">
          {messages.length === 0 ? (
            <ol className="flex flex-col gap-4 text-[1rem] leading-snug">
              {[
                ["Press the button and speak", "Say only what is abnormal, in any order."],
                ["Check the report", "Everything you did not mention stays normal."],
                ["Paste into PACS", "The report is copied for you. Press Ctrl+V."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.9rem] font-bold text-surface">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-ink-soft">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="flex flex-col gap-3">
              {messages.map((message, index) => (
                <li key={index} className="rounded-2xl border border-ink/45 px-4 py-3">
                  <p className="text-[0.98rem] leading-snug">{message.dictation}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.88rem] font-semibold">
                    <span className="flex items-center gap-1.5 text-teal-deep">
                      <CheckCircle weight="fill" className="h-4 w-4" />
                      {message.changed} {message.changed === 1 ? "line" : "lines"} updated
                    </span>
                    {message.flagged > 0 && (
                      <span className="flex items-center gap-1.5 text-flag">
                        <WarningCircle weight="fill" className="h-4 w-4" />
                        {message.flagged} to check
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
          {/* Known before any click: say so, instead of waiting for a failed attempt. */}
          {dictation.access === "blocked" && !error && !dictation.error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-flag/50 bg-flag/10 px-3.5 py-2.5 text-[0.92rem] font-semibold text-flag"
            >
              <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
              {MICROPHONE_MESSAGES.blocked}
            </p>
          )}

          {(error || dictation.error) && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-flag/50 bg-flag/10 px-3.5 py-2.5 text-[0.92rem] font-semibold text-flag"
            >
              <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
              {error || dictation.error}
            </p>
          )}

          {/* Shown before the browser's own question, so it does not come as a surprise. */}
          {dictation.access === "ask" && !dictation.error && !error && (
            <p className="flex items-start gap-2 rounded-2xl bg-ink/[0.05] px-3.5 py-2.5 text-[0.92rem] leading-snug text-ink">
              <Info weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              {MICROPHONE_MESSAGES.ask}
            </p>
          )}

          <textarea
            value={[draft, dictation.interim].filter(Boolean).join(" ")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!busy && !dictation.recording && draft.trim()) send(Promise.resolve(draft));
              }
            }}
            readOnly={dictation.recording || dictation.starting}
            rows={3}
            aria-label="What you said"
            placeholder="Your words appear here. You can also type."
            className={`w-full resize-none rounded-2xl border-2 bg-surface px-4 py-3 text-[1.02rem] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-quiet ${
              dictation.recording ? "border-flag" : "border-ink/60 focus:border-teal"
            }`}
          />

          <button
            type="button"
            onClick={toggleMic}
            disabled={busy || dictation.starting}
            className={`flex h-14 items-center justify-center gap-3 rounded-full text-[1.05rem] font-bold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-60 ${
              dictation.recording ? "bg-flag hover:bg-flag/90" : "bg-teal hover:bg-teal-deep"
            }`}
          >
            {dictation.recording ? (
              <>
                <Stop weight="fill" className="h-5 w-5" />
                Stop and write report
              </>
            ) : (
              <>
                <Microphone weight="fill" className="h-6 w-6" />
                {busy ? "Writing report" : dictation.starting ? "Starting" : "Start speaking"}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => send(Promise.resolve(draft))}
            disabled={busy || dictation.recording || !draft.trim()}
            className="h-11 rounded-full border border-ink/65 text-[0.95rem] font-bold text-ink transition-colors hover:border-ink hover:bg-ink/[0.06] disabled:opacity-60"
          >
            Update report from typed text
          </button>
        </div>
      </aside>
    </main>
  );
}
