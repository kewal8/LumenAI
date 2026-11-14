"use client";

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
import { useDictation } from "@/lib/useDictation";

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

  function newCase(next = template) {
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
      setCopyState((await copied) ? "copied" : "stale");
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

  const inputClass =
    "w-full resize-none rounded border px-2 py-1 text-sm leading-6 bg-transparent";

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center gap-3">
          <select
            value={template.id}
            onChange={(event) =>
              newCase(templates.find((item) => item.id === event.target.value))
            }
            className="rounded border border-ink/20 bg-transparent px-2 py-1.5 text-sm"
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => newCase()}
            className="rounded-full border border-ink/20 px-4 py-1.5 text-sm"
          >
            New case
          </button>

          <button
            onClick={() => copy(report)}
            disabled={copyState === "empty"}
            className={`ml-auto rounded-full px-4 py-1.5 text-sm font-medium ${
              copyState === "copied"
                ? "bg-teal/[0.1] text-teal-deep"
                : copyState === "stale"
                  ? "bg-flag text-btn-text hover:bg-flag/90"
                  : "border border-ink/20 text-ink-quiet"
            }`}
          >
            {copyState === "copied" && "Copied. Press Ctrl+V in PACS"}
            {copyState === "stale" && "Not copied. Click to copy"}
            {copyState === "empty" && "Nothing to copy yet"}
          </button>
        </header>

        {flaggedLines > 0 && (
          <p className="rounded border border-amber/50 bg-amber/[0.14] px-3 py-2 text-sm text-amber-deep">
            {flaggedLines} line{flaggedLines > 1 ? "s" : ""} need checking before
            sign-off.
          </p>
        )}

        {/* Report text is set in Arial, as the PACS editor will show it. */}
        <article className="flex flex-col gap-4 rounded-3xl border border-ink/[0.1] bg-surface p-6 font-[Arial,Helvetica,sans-serif] tracking-normal">
          <h1 className="text-center text-sm font-bold">{report.title}</h1>

          {report.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-1.5">
              <h2 className="text-sm font-bold">{section.heading}:</h2>
              {section.lines.map((line) => (
                <div key={line.id}>
                  <textarea
                    value={line.text}
                    onChange={(event) =>
                      editLine(section.id, line.id, event.target.value)
                    }
                    rows={Math.max(1, Math.ceil(line.text.length / 90))}
                    title={line.source ? `Dictated: "${line.source}"` : undefined}
                    className={`${inputClass} ${
                      line.warnings.length > 0
                        ? "border-flag bg-flag/10"
                        : line.status === "normal"
                          ? "border-transparent text-ink-quiet"
                          : "border-teal/40 bg-teal/[0.07]"
                    }`}
                  />
                  {line.warnings.map((warning) => (
                    <p key={warning} className="px-2 text-xs text-flag">
                      {warning}
                    </p>
                  ))}
                  {line.source && (
                    <p className="px-2 text-xs text-ink-quiet">
                      Dictated: “{line.source}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-bold">IMPRESSION:</h2>
            <textarea
              value={report.impression.join("\n")}
              onChange={(event) =>
                edited({ ...report, impression: event.target.value.split("\n") })
              }
              rows={Math.max(2, report.impression.length)}
              className={`${inputClass} border-ink/20`}
            />
          </div>
        </article>
      </section>

      <aside className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between">
          <h2 className="font-semibold">Dictation</h2>
        </header>

        <ol className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && (
            <li className="text-sm text-ink-quiet">
              Dictate or type only the abnormal findings. Everything else stays
              normal.
            </li>
          )}
          {messages.map((message, index) => (
            <li
              key={index}
              className="rounded border border-ink/20 p-2 text-sm"
            >
              <p>{message.dictation}</p>
              <p className="mt-1 text-xs text-ink-quiet">
                {message.changed} line{message.changed === 1 ? "" : "s"} updated
                {message.flagged > 0 && `, ${message.flagged} to check`}
              </p>
            </li>
          ))}
        </ol>

        {(error || dictation.error) && (
          <p className="rounded border border-flag/40 bg-flag/10 px-3 py-2 text-sm text-flag">
            {error || dictation.error}
          </p>
        )}

        <textarea
          value={[draft, dictation.interim].filter(Boolean).join(" ")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!busy && !dictation.recording) send(Promise.resolve(draft));
            }
          }}
          readOnly={dictation.recording || dictation.starting}
          rows={4}
          placeholder="Dictate your positive findings here"
          className={`${inputClass} border-ink/20`}
        />

        <div className="flex gap-2">
          <button
            onClick={toggleMic}
            disabled={busy || dictation.starting}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium text-btn-text disabled:opacity-40 ${
              dictation.recording
                ? "bg-flag hover:bg-flag/90"
                : "bg-btn hover:bg-teal-deep"
            }`}
          >
            {dictation.recording
              ? "Stop and update report"
              : dictation.starting
                ? "Starting…"
                : "Dictate"}
          </button>
          <button
            onClick={() => send(Promise.resolve(draft))}
            disabled={busy || dictation.recording || !draft.trim()}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm disabled:opacity-40"
          >
            {busy ? "Updating…" : "Update"}
          </button>
        </div>
      </aside>
    </main>
  );
}
