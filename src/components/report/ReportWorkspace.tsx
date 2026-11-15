"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowsClockwise,
  CaretDown,
  CheckCircle,
  CircleNotch,
  Copy,
  DotsSixVertical,
  FloppyDisk,
  Info,
  Microphone,
  PencilSimpleLine,
  Plus,
  ShieldCheck,
  Sparkle,
  Stop,
  WarningCircle,
  Printer,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge, Chip, IconTile, buttonClass, formatDateTime, tidyHeading } from "@/components/app/ui";
import { send as sendJson } from "@/components/auth/fields";
import { copyReport } from "@/lib/clipboard";
import {
  applyPatch,
  logEntryFor,
  reportFromTemplate,
  type LogEntry,
  type PatchOp,
  type Report,
  type Template,
} from "@/lib/report";
import {
  buildPrintHtml,
  buildReportHtml,
  buildReportText,
  type FormattedReport,
  type PasteProfile,
} from "@/lib/reportFormat";
import type { ReportIdentity } from "@/lib/reportIdentity";
import { comboFromEvent, type ShortcutAction, type Shortcuts } from "@/lib/shortcuts";
import { TemplatePicker } from "./TemplatePicker";
import { MICROPHONE_MESSAGES, useDictation } from "@/lib/useDictation";

/** A dictation that could not be written into the report, kept so it can be retried. */
type FailedDictation = { text: string; message: string };
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
  identity,
  shortcuts,
  templates,
  saved,
}: {
  profile: PasteProfile;
  /** The doctor's sign-off and letterhead, from Settings. */
  identity: ReportIdentity;
  /** The doctor's keyboard shortcuts, from Settings. */
  shortcuts: Shortcuts;
  templates: Template[];
  /** A saved report being reopened. Left out for a new report. */
  saved?: { id: string; template: Template; report: Report };
}) {
  const router = useRouter();
  const signature = { text: identity.signatureText, image: identity.signatureImage };
  const [template, setTemplate] = useState(saved?.template ?? templates[0]);
  const [report, setReport] = useState(() => saved?.report ?? reportFromTemplate(templates[0]));
  const [savedId, setSavedId] = useState(saved?.id ?? null);
  // True while the report has changes that are not in "Reports" yet.
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // The template waiting to be started while the "Save this report?" question is open.
  const [pending, setPending] = useState<Template | null>(null);
  // Every dictation written into this report, oldest first. Saved with the report.
  const [log, setLog] = useState<LogEntry[]>(saved?.report.log ?? []);
  // The dictation being written into the report right now, and the last one that failed.
  const [writing, setWriting] = useState<string | null>(null);
  const [failed, setFailed] = useState<FailedDictation | null>(null);
  // Which log entry has its list of changes open.
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [draft, setDraftState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("empty");

  // Mirrors of state for callbacks that outlive a render (speech socket, timers).
  const reportRef = useRef(report);
  const logRef = useRef(log);
  useEffect(() => {
    reportRef.current = report;
    logRef.current = log;
  });

  // Keeps the newest log entry in view.
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [log.length, writing, failed]);
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

  const hasFindings = report.sections.some((section) =>
    section.lines.some((line) => line.status !== "normal"),
  );

  async function save() {
    setSaving(true);
    setError("");
    const body = { template, report: { ...reportRef.current, log: logRef.current } };
    const result = savedId
      ? await sendJson<{ id: string }>("PATCH", `/api/reports/${savedId}`, body)
      : await sendJson<{ id: string }>("POST", "/api/reports", body);
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error);
      return false;
    }
    setSavedId(result.data.id);
    setDirty(false);
    return true;
  }

  // Asks first when there is work that has not been saved.
  function newCase(next = template) {
    if (dirty) setPending(next);
    else startNew(next);
  }

  function startNew(next: Template) {
    setPending(null);
    // A reopened report lives at its own address; a new one starts on the New report screen.
    if (saved) {
      router.push(`/report?template=${encodeURIComponent(next.id)}`);
      return;
    }
    setSavedId(null);
    setDirty(false);
    setTemplate(next);
    setReport(reportFromTemplate(next));
    setLog([]);
    setWriting(null);
    setFailed(null);
    setDraft("");
    setError("");
    setCopyState("empty");
  }

  // Prints through a hidden frame, so the report page itself stays as it is.
  // "Save as PDF" in the print window gives the PDF.
  function print() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.srcdoc = buildPrintHtml(
      formatted(report),
      profile,
      signature,
      identity.letterheadEnabled ? { header: identity.headerImage, footer: identity.footerImage } : null,
    );
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.append(frame);
  }

  async function copy(next: Report) {
    const output = formatted(next);
    try {
      await copyReport(buildReportHtml(output, profile, signature), buildReportText(output, profile, signature));
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
    setDirty(true);
    const entry = logEntryFor(next, ops, text, logRef.current.length === 0);
    setLog((previous) => [...previous, entry]);
    setOpenEntry(entry.id);
    return next;
  }

  // Must be called from a click or key press. The clipboard write starts now,
  // while the browser still counts it as user-initiated, and is filled in when
  // the report arrives a few seconds later.
  async function send(textPromise: Promise<string>) {
    setBusy(true);
    setError("");
    setFailed(null);
    setCopyState("stale");

    // Known once the words have arrived; used to show the failed dictation in the log.
    let dictated = "";
    const nextReport = textPromise.then(async (text) => {
      if (!text.trim()) throw new Error("Nothing was dictated.");
      dictated = text.trim();
      setWriting(dictated);
      const next = await generate(dictated);
      setDraft("");
      return next;
    });
    const output = nextReport.then(formatted);

    const copied = navigator.clipboard
      .write([
        new ClipboardItem({
          "text/html": output.then((value) =>
            toBlob(buildReportHtml(value, profile, signature), "text/html"),
          ),
          "text/plain": output.then((value) =>
            toBlob(buildReportText(value, profile, signature), "text/plain"),
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
      const message = cause instanceof Error ? cause.message : "Could not update the report.";
      // A dictation that did not reach the report stays in the log, with a way to retry.
      if (dictated) setFailed({ text: dictated, message });
      else setError(message);
    } finally {
      setWriting(null);
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

  // Keyboard shortcuts. The handlers are read through a ref so the listener
  // is attached once and still calls the latest version of each action.
  const actions = useRef<Record<ShortcutAction, () => void>>(null);
  useEffect(() => {
    // Same limits as the buttons: nothing fires while a report is being written.
    actions.current = {
      dictate: () => !busy && !dictation.starting && toggleMic(),
      copy: () => !busy && copy(report),
      save: () => !busy && !saving && (savedId === null || dirty) && save(),
      print: () => !busy && print(),
      new: () => !busy && newCase(),
    };
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const combo = comboFromEvent(event);
      if (!combo || event.repeat) return;
      const match = (Object.keys(shortcuts) as ShortcutAction[]).find((id) => shortcuts[id] === combo);
      if (!match) return;
      event.preventDefault();
      actions.current?.[match]();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);

  // Typed edits: recopy shortly after the radiologist stops typing.
  const editTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function edited(next: Report) {
    setReport(next);
    setDirty(true);
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

  // The box that shows the spoken words. Its height can be dragged with the
  // bar above it, and it grows by itself when the dictation outgrows it.
  const BOX_MIN = 96;
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // The height the doctor chose by dragging. The box never goes below it.
  const boxBase = useRef(BOX_MIN);
  const shownWords = [draft, dictation.interim].filter(Boolean).join(" ");

  function fitBox() {
    const box = boxRef.current;
    if (!box) return;
    // Leave room for the log and the buttons: at most 55% of the panel.
    const most = Math.max(BOX_MIN, Math.round((panelRef.current?.clientHeight ?? 600) * 0.55));
    const base = Math.min(Math.max(boxBase.current, BOX_MIN), most);
    boxBase.current = base;
    box.style.height = `${base}px`;
    box.style.height = `${Math.min(Math.max(base, box.scrollHeight + 2), most)}px`;
  }

  useLayoutEffect(() => {
    fitBox();
    // While speaking, keep the newest words in view.
    const box = boxRef.current;
    if (box && dictation.recording) box.scrollTop = box.scrollHeight;
  }, [shownWords, dictation.recording]);

  useEffect(() => {
    const stored = Number(localStorage.getItem("lumenai-dictation-box"));
    if (stored >= BOX_MIN) {
      boxBase.current = stored;
      fitBox();
    }
  }, []);

  function resizeBox(height: number) {
    boxBase.current = height;
    fitBox();
    try {
      localStorage.setItem("lumenai-dictation-box", String(boxBase.current));
    } catch {
      // Not remembered for next time; the size still applies now.
    }
  }

  function dragBox(event: React.PointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    const startY = event.clientY;
    const startHeight = boxRef.current?.offsetHeight ?? boxBase.current;
    try {
      // Keeps the drag going when the pointer leaves the thin bar.
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Capture is unavailable for this pointer; the drag still works over the bar.
    }
    const move = (moved: PointerEvent) => resizeBox(startHeight + (startY - moved.clientY));
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
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
    "block w-full resize-none rounded-lg border border-transparent bg-transparent px-2.5 py-1 text-ink outline-none transition-colors [field-sizing:content] hover:border-ink/60 focus:border-teal focus:bg-surface";

  // On a laptop the workspace is exactly one screen tall: the report scrolls
  // inside its column and the dictation panel never moves.
  return (
    <main className="flex min-w-0 flex-1 flex-col lg:h-[100dvh] lg:flex-none lg:flex-row lg:overflow-hidden">
      {/* The report: what will be pasted into PACS. */}
      <section className="order-2 flex min-w-0 flex-1 flex-col lg:order-1 lg:overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
            <span aria-hidden="true">Template</span>
            <TemplatePicker
              templates={templates}
              value={template.id}
              onChange={(id) => newCase(templates.find((item) => item.id === id))}
            />
          </div>
          <button
            type="button"
            onClick={() => newCase()}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/35 px-4 text-[0.95rem] font-semibold transition-colors hover:border-ink/60 hover:bg-ink/[0.04]"
          >
            <Plus weight="bold" className="h-4 w-4" />
            New report
          </button>

        </header>

        <div className="min-h-0 flex-1 px-4 py-6 sm:px-8 lg:overflow-y-auto">
          <div className="mx-auto flex max-w-[72rem] flex-col gap-4">
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
            <article className="rounded-3xl border border-ink/20 bg-surface px-5 py-7 font-[Arial,Helvetica,sans-serif] text-[0.95rem] leading-[1.6] tracking-normal text-ink shadow-[0_1px_2px_rgb(15_38_36/0.06)] sm:px-9 sm:py-9">
              <div
                aria-live="polite"
                className="sticky top-0 z-10 -mx-5 -mt-7 mb-7 flex flex-wrap items-center gap-3 rounded-t-3xl border-b border-line bg-surface px-5 py-3 font-[family-name:var(--font-brand)] sm:-mx-9 sm:-mt-9 sm:mb-8 sm:px-6"
              >
                <p className="mr-auto flex items-center gap-2 text-[0.95rem] font-semibold text-ink-soft">
                  {savedId && !dirty ? (
                    <>
                      <CheckCircle weight="fill" className="h-5 w-5 text-teal" />
                      Saved in Reports
                    </>
                  ) : savedId ? (
                    "Changes not saved"
                  ) : (
                    "Not saved yet"
                  )}
                </p>
            <button type="button" onClick={print} disabled={busy} className={buttonClass.secondary}>
              <Printer weight="bold" className="h-5 w-5" />
              Print or PDF
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || busy || (savedId !== null && !dirty)}
              className={buttonClass.secondary}
            >
              <FloppyDisk weight="bold" className="h-5 w-5" />
              {saving ? "Saving" : "Save"}
            </button>
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
                  className={`${lineClass} mt-1.5 ${hasFindings ? "font-bold" : ""}`}
                />
              </div>

              {/* The sign-off travels with every copy and print. It is set in Settings. */}
              {(signature.image || signature.text) && (
                <div className="mt-8 px-2.5">
                  {signature.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- a stored data URL
                    <img src={signature.image} alt="Your signature" className="h-14 w-auto rounded bg-[#fff]" />
                  )}
                  {signature.text.split("\n").map((line, index) => (
                    <p key={index} className={index === 0 ? "font-bold" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
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
        ref={panelRef}
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
                  ? "border border-ink/25 bg-surface text-ink"
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
          {log.length === 0 && !writing && !failed ? (
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
            <>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[1rem] font-semibold">Report log</h3>
                <Badge>
                  {log.length} {log.length === 1 ? "dictation" : "dictations"}
                </Badge>
              </div>

              <ol aria-live="polite" className="flex flex-col gap-3">
                {log.map((entry) => {
                  const flagged = entry.changes.filter((change) => change.flagged).length;
                  const open = openEntry === entry.id;
                  return (
                    <li key={entry.id} className="rounded-2xl border border-ink/25 bg-surface">
                      <button
                        type="button"
                        onClick={() => setOpenEntry(open ? null : entry.id)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-ink/[0.04]"
                      >
                        <IconTile tone={flagged > 0 ? "amber" : "teal"}>
                          {entry.kind === "created" ? (
                            <Sparkle weight="fill" className="h-5 w-5" />
                          ) : (
                            <ArrowsClockwise weight="bold" className="h-5 w-5" />
                          )}
                        </IconTile>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[1rem] font-semibold leading-snug">
                            {entry.kind === "created" ? "Report created" : "Report updated"}
                          </span>
                          <span className="block text-[0.88rem] font-semibold text-ink-soft">
                            {formatDateTime(entry.at)}
                          </span>
                        </span>
                        <CaretDown
                          weight="bold"
                          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>

                      <div className="border-t border-line px-3.5 py-3">
                        <p className="text-[0.82rem] font-bold uppercase tracking-[0.04em] text-ink-soft">
                          You said
                        </p>
                        <p className="mt-1 text-[0.98rem] leading-snug">{entry.dictation}</p>
                      </div>

                      {open && entry.changes.length > 0 && (
                        <ul className="flex flex-col gap-2.5 border-t border-line px-3.5 py-3">
                          {entry.changes.map((change, index) => (
                            <li key={index} className="flex flex-col items-start gap-1.5">
                              <Chip>{tidyHeading(change.heading)}</Chip>
                              <p
                                className={`flex items-start gap-1.5 text-[0.95rem] leading-snug ${
                                  change.flagged ? "font-semibold text-flag" : ""
                                }`}
                              >
                                {change.flagged && (
                                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                                )}
                                {change.text}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-2.5">
                        <Badge tone="teal">
                          {entry.changes.length} {entry.changes.length === 1 ? "line" : "lines"} changed
                        </Badge>
                        {flagged > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-flag/50 bg-flag/10 px-2.5 py-0.5 text-[0.85rem] font-bold text-flag">
                            <WarningCircle weight="fill" className="h-4 w-4" />
                            {flagged} to check
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-teal-deep">
                            <ShieldCheck weight="fill" className="h-4 w-4" />
                            Checked, no problems
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}

                {writing && (
                  <li className="rounded-2xl border-2 border-amber bg-amber/15 px-3.5 py-3">
                    <p className="flex items-center gap-2.5 text-[1rem] font-semibold text-amber-deep">
                      <CircleNotch weight="bold" className="h-5 w-5 animate-spin" />
                      Writing into the report
                    </p>
                    <p className="mt-2 text-[0.98rem] leading-snug">{writing}</p>
                  </li>
                )}

                {failed && (
                  <li role="alert" className="rounded-2xl border-2 border-flag bg-flag/10 px-3.5 py-3">
                    <p className="flex items-center gap-2.5 text-[1rem] font-semibold text-flag">
                      <WarningCircle weight="fill" className="h-5 w-5" />
                      Not added to the report
                    </p>
                    <p className="mt-1 text-[0.92rem] font-semibold text-flag">{failed.message}</p>
                    <p className="mt-2 text-[0.98rem] leading-snug">{failed.text}</p>
                    <button
                      type="button"
                      onClick={() => send(Promise.resolve(failed.text))}
                      disabled={busy || dictation.recording}
                      className={`${buttonClass.secondary} mt-3`}
                    >
                      <ArrowsClockwise weight="bold" className="h-5 w-5" />
                      Try again
                    </button>
                  </li>
                )}
              </ol>
              <div ref={logEnd} />
            </>
          )}
        </div>

        {/* Drag up or down to give the dictation box more or less room. */}
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize the dictation box"
          tabIndex={0}
          onPointerDown={dragBox}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            resizeBox(boxBase.current + (event.key === "ArrowUp" ? 32 : -32));
          }}
          className="group relative flex h-5 shrink-0 cursor-ns-resize touch-none items-center justify-center outline-none"
        >
          <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ink/25 transition-colors group-hover:bg-teal group-focus-visible:bg-teal" />
          <span className="relative grid h-5 w-12 place-items-center rounded-full border border-ink/35 bg-surface text-ink transition-colors group-hover:border-teal group-hover:text-teal group-focus-visible:border-teal group-focus-visible:text-teal">
            <DotsSixVertical weight="bold" className="h-4 w-4 rotate-90" />
          </span>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-4 pt-2">
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

          {/* Always on: there is no switch, because a report should never skip its checks. */}
          <p className="flex items-center gap-2 text-[0.9rem] font-semibold text-teal-deep">
            <ShieldCheck weight="fill" className="h-5 w-5 shrink-0" />
            Every update is checked for side, numbers and “no”.
          </p>

          <textarea
            ref={boxRef}
            value={shownWords}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!busy && !dictation.recording && draft.trim()) send(Promise.resolve(draft));
              }
            }}
            readOnly={dictation.recording || dictation.starting}
            style={{ height: BOX_MIN }}
            aria-label="What you said"
            placeholder="Your words appear here. You can also type."
            className={`w-full resize-none rounded-2xl border-2 bg-surface px-4 py-3 text-[1.02rem] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-quiet ${
              dictation.recording ? "border-flag" : "border-ink/35 focus:border-teal"
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
            className="h-11 rounded-full border border-ink/35 text-[0.95rem] font-bold text-ink transition-colors hover:border-ink/60 hover:bg-ink/[0.06] disabled:opacity-60"
          >
            Update report from typed text
          </button>
        </div>
      </aside>

      <Dialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#06110f]/50" />
          <Dialog.Popup className="app-layer fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(6_17_15/0.55)] outline-none sm:p-8">
            <Dialog.Title className="text-[1.4rem] font-semibold tracking-[-0.02em]">
              Save this report?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-[1.02rem] leading-relaxed text-ink-soft">
              {savedId
                ? "You changed this report after saving it. Save the changes before starting a new one?"
                : "This report is not saved yet. Save it to Reports before starting a new one?"}
            </Dialog.Description>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const next = pending;
                  if (next && (await save())) startNew(next);
                }}
                className={`${buttonClass.primary} h-12`}
              >
                <FloppyDisk weight="bold" className="h-5 w-5" />
                {saving ? "Saving" : "Save and start new report"}
              </button>
              <button
                type="button"
                onClick={() => pending && startNew(pending)}
                className={`${buttonClass.danger} h-12`}
              >
                Do not save
              </button>
              <Dialog.Close className={`${buttonClass.quiet} h-12`}>Go back to this report</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
