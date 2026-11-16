"use client";

import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowsClockwise,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  DotsSixVertical,
  FloppyDisk,
  Info,
  Microphone,
  Minus,
  PencilSimpleLine,
  Plus,
  ShieldCheck,
  Sparkle,
  WarningCircle,
  Printer,
  SealCheck,
  ArrowUp,
  ArrowsInSimple,
  ArrowsOutSimple,
  CornersIn,
  CornersOut,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buttonClass, formatDateTime, tidyHeading } from "@/components/app/ui";
import { send as sendJson } from "@/components/auth/fields";
import { Tip } from "@/components/Tip";
import { copyReport, writeClipboard } from "@/lib/clipboard";
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
import type { IdentitySummary, ReportIdentity } from "@/lib/reportIdentity";
import { useIdentityImages } from "@/lib/useIdentityImages";
import { expandMacros, removeLastMacro, type Macro } from "@/lib/macros";
import { comboFromEvent, type ShortcutAction, type Shortcuts } from "@/lib/shortcuts";
import { FinalizeDialog } from "./FinalizeDialog";
import { FloatingBox, useFloatingWindow } from "./FloatingBox";
import { useLineVoice } from "./LineVoice";
import { useEditorVoice } from "./editor/EditorVoice";
import { TemplatePicker } from "./TemplatePicker";
import { ReportEditor, type ReportEditorHandle } from "./editor/ReportEditor";
import { docToHtml, docToReport, docToText, reportToDoc, type DocNode } from "@/lib/reportDoc";
import type { Credits } from "@/lib/workspace";
import { setUpdatesLeft } from "@/lib/updatesLeft";
import { BLANK_TEMPLATE, BLANK_TEMPLATE_ID } from "@/lib/templates";
import { EMPTY_PATIENT, ageSex, hasPatient, type Patient } from "@/lib/patient";
import { AssistantMenu } from "./AssistantMenu";
import { PatientDialog } from "./PatientDialog";
import { VoiceButton } from "./VoiceButton";
import { MICROPHONE_MESSAGES, useDictation, type Word } from "@/lib/useDictation";
import { COMMAND_LABELS, appendSpoken, spokenStream, type SpokenPiece } from "@/lib/voiceCommands";

/** A dictation that could not be written into the report, kept so it can be retried. */
type FailedDictation = { text: string; message: string };
type CopyState = "empty" | "copied" | "stale";

function formatted(report: Report): FormattedReport {
  return {
    title: report.title,
    sections: [
      ...report.sections.map((section) => ({
        heading: section.heading,
        // A line started by "next line" and left empty is not part of the report.
        lines: section.lines.map((line) => line.text).filter((text) => text.trim()),
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
  identity: identitySummary,
  shortcuts,
  floatingBox,
  macros: initialMacros,
  credits: initialCredits,
  design = "classic",
  template: startTemplate,
  saved,
}: {
  profile: PasteProfile;
  /** The doctor's sign-off and letterhead, from Settings. */
  identity: IdentitySummary;
  /** The doctor's keyboard shortcuts, from Settings. */
  shortcuts: Shortcuts;
  /** Whether the floating dictation window opens by itself, from Settings. */
  floatingBox: boolean;
  /** The doctor's short forms, expanded in everything they dictate or type. */
  macros: Macro[];
  /** AI updates left today for the account. */
  credits: Credits;
  /** "future" is the current report screen; "classic" is version one, kept as a backup. */
  design?: "future" | "classic";
  /** The template a new report starts from. Others are fetched when picked. */
  template: Template;
  /** A saved report being reopened. Left out for a new report. */
  saved?: { id: string; template: Template; report: Report; finalizedAt?: string | null; patient?: Patient | null };
}) {
  const router = useRouter();
  // The page arrives without the signature and letterhead images; they are
  // fetched once and kept by the browser. Copy and print wait for them.
  const { identity, ready: identityReady } = useIdentityImages(identitySummary);
  const signature = { text: identity.signatureText, image: identity.signatureImage };
  /** The identity with its images, or null (with a message) when they could not be loaded. */
  async function fullIdentity(): Promise<ReportIdentity | null> {
    try {
      return await identityReady();
    } catch {
      toast.error("Your signature and letterhead could not be loaded. Check the connection and try again.");
      return null;
    }
  }
  const [template, setTemplate] = useState(saved?.template ?? startTemplate);
  const [report, setReport] = useState(() => saved?.report ?? reportFromTemplate(startTemplate));
  const [savedId, setSavedId] = useState(saved?.id ?? null);
  // Who the report is for. Asked for on the first save, and confirmed before finalizing.
  const [patient, setPatient] = useState<Patient | null>(saved?.patient ?? null);
  const [patientAsk, setPatientAsk] = useState<"save" | "finalize" | "edit" | null>(null);
  // What to do once a save asked for from elsewhere (such as starting a new report) succeeds.
  const afterSave = useRef<(() => void) | null>(null);
  // When the report was last finalized, and whether the finalized preview is open.
  const [finalizedAt, setFinalizedAt] = useState<string | null>(saved?.finalizedAt ?? null);
  const [showFinal, setShowFinal] = useState(false);
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
  // The conversation entry whose exact words are shown instead of the tidied ones.
  const [exactWords, setExactWords] = useState<string | null>(null);
  const [draft, setDraftState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("empty");
  const [credits, setCredits] = useState(initialCredits);

  // The new design writes into the rich report editor. Its document is the
  // report people see, copy and print; the report lines are kept in step with it.
  const future = design === "future";
  const editorRef = useRef<ReportEditorHandle>(null);
  const docFor = (value: Report) => (value.doc as DocNode | undefined) ?? reportToDoc(value, profile);
  // A new report starts from the template's own page when it has one.
  const startDoc = (from: Template) => (from.doc as DocNode | undefined) ?? docFor(reportFromTemplate(from));
  const [initialDoc, setInitialDoc] = useState(() => (saved ? docFor(saved.report) : startDoc(startTemplate)));
  // Changed to start the editor afresh with `initialDoc`, on a new report.
  const [editorSeed, setEditorSeed] = useState(0);
  // True while a dictation is being written into the editor, so it is not taken for typing.
  const applying = useRef(false);

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
    // Scrolls only the list the log sits in. scrollIntoView would also move
    // the panel and the page around it, pushing headers out of sight.
    let list = logEnd.current?.parentElement ?? null;
    while (list && !/(auto|scroll)/.test(getComputedStyle(list).overflowY)) list = list.parentElement;
    if (list) list.scrollTop = list.scrollHeight;
  }, [log.length, writing, failed]);
  // Written directly so the last spoken words are readable the moment the
  // speech connection closes, before React has re-rendered.
  const draftRef = useRef("");
  function setDraft(text: string) {
    draftRef.current = text;
    setDraftState(text);
    // A new dictation starts a new history for "undo that".
    if (!text) spokenHistory.current = [];
  }
  // The box before and after each spoken change, newest last, for "undo that".
  const spokenHistory = useRef<{ before: string; after: string }[]>([]);
  // The spoken command just carried out, shown for a moment so the doctor knows it was heard.
  const [heard, setHeard] = useState("");
  const heardTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /**
   * Speech into the dictation box: report words are added, and spoken commands
   * ("next line", "delete last macro", "undo that") are carried out instead of written.
   */
  const listener = useRef(spokenStream());
  function hear(words: Word[]) {
    apply(listener.current.push(words.map((word) => word.text).join(" ")));
  }
  function apply(pieces: SpokenPiece[]) {
    let text = draftRef.current;
    let message = "";
    for (const piece of pieces) {
      const before = text;
      if (piece.kind === "text") {
        text = appendSpoken(text, piece.text);
      } else if (piece.command === "newLine" || piece.command === "newParagraph") {
        text = text.trimEnd() + (piece.command === "newLine" ? "\n" : "\n\n");
        message = COMMAND_LABELS[piece.command];
      } else if (piece.command === "deleteMacro") {
        const result = removeLastMacro(text, macrosRef.current);
        text = result.text;
        message = result.macro ? `Removed the macro “${result.macro.shortForm}”` : "No macro to remove";
      } else {
        const last = spokenHistory.current.pop();
        if (last && last.after === text) {
          text = last.before;
          message = "Undone";
        } else {
          message = "Nothing to undo";
        }
        continue;
      }
      if (text !== before) spokenHistory.current.push({ before, after: text });
    }
    setDraft(text);
    if (message) {
      clearTimeout(heardTimer.current);
      setHeard(message);
      heardTimer.current = setTimeout(() => setHeard(""), 2500);
    }
  }

  // Short forms are managed in Settings; here they are only expanded as the doctor speaks.
  const [macros] = useState(initialMacros);
  const macrosRef = useRef(macros);
  macrosRef.current = macros;

  const dictation = useDictation({
    model: "nova-3-medical",
    language: "en-IN",
    // Helps speech recognition hear short forms such as "CSV" as written.
    keyterms: macros.map((macro) => macro.shortForm).slice(0, 50),
    onWords: hear,
  });

  // Speaking straight into one line, word for word, at the cursor.
  const lineVoice = useLineVoice({ macros });
  // Only one microphone at a time: no line speaking while a dictation runs.
  const lineVoiceBlocked = dictation.recording || dictation.starting || busy;
  // The same, in the rich report editor of the new report screen.
  const editorVoice = useEditorVoice({ macros });

  const hasFindings = report.sections.some((section) =>
    section.lines.some((line) => line.status !== "normal"),
  );

  async function save(finalize = false, details: Patient | null = patient) {
    setSaving(true);
    setError("");
    const body = { template, report: { ...reportRef.current, log: logRef.current }, finalize, patient: details };
    const result = savedId
      ? await sendJson<{ id: string; finalizedAt: string | null }>("PATCH", `/api/reports/${savedId}`, body)
      : await sendJson<{ id: string; finalizedAt: string | null }>("POST", "/api/reports", body);
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error);
      toast.error(result.error || "The report could not be saved.");
      return false;
    }
    toast.success(finalize ? "Report finalized and saved" : savedId ? "Changes saved" : "Report saved to Reports");
    setSavedId(result.data.id);
    setFinalizedAt(result.data.finalizedAt ?? null);
    setDirty(false);
    return true;
  }

  // Saving needs the patient's details: they are asked for the first time.
  function requestSave(then?: () => void) {
    afterSave.current = then ?? null;
    if (hasPatient(patient)) {
      void save().then((ok) => ok && then?.());
    } else {
      setPatientAsk("save");
    }
  }

  // Finalizing is the end of the AI work, so it opens once the AI Assistant has
  // updated this report (a reopened report with its history counts too).
  const readyToFinalize = log.length > 0 || Boolean(finalizedAt);

  // The last step: the details are confirmed, the report is saved as final and shown as it will print.
  function finalize() {
    afterSave.current = null;
    setPatientAsk("finalize");
  }

  /** The details as the pop-up starts with them: what was given, or suggestions from the template. */
  const patientDraft: Patient = patient ?? {
    ...EMPTY_PATIENT,
    // A blank report has no study name to suggest.
    study: template.id === BLANK_TEMPLATE_ID ? "" : template.name,
    modality: template.modality ?? null,
  };

  async function submitPatient(details: Patient) {
    const purpose = patientAsk;
    setPatient(details);
    if (purpose === "edit") {
      setPatientAsk(null);
      // Counts as a change: saved with the next save, and not lost silently by starting a new report.
      setDirty(true);
      return;
    }
    const ok = await save(purpose === "finalize", details);
    if (!ok) return;
    setPatientAsk(null);
    if (purpose === "finalize") setShowFinal(true);
    const then = afterSave.current;
    afterSave.current = null;
    then?.();
  }

  function printHtml(from: ReportIdentity = identity) {
    const doc = future ? editorRef.current?.getDoc() : undefined;
    return buildPrintHtml(
      formatted(report),
      profile,
      { text: from.signatureText, image: from.signatureImage },
      from.letterheadEnabled ? { header: from.headerImage, footer: from.footerImage } : null,
      doc ? docToHtml(doc, profile) : undefined,
    );
  }

  /** The report for the clipboard: rich and plain, from the editor in the new design. */
  function clipboardParts(value: Report, from: ReportIdentity = identity) {
    const sign = { text: from.signatureText, image: from.signatureImage };
    const doc = future ? editorRef.current?.getDoc() : undefined;
    if (doc) return { html: docToHtml(doc, profile, sign), text: docToText(doc, sign) };
    const output = formatted(value);
    return { html: buildReportHtml(output, profile, sign), text: buildReportText(output, profile, sign) };
  }

  // A template picked from the list is fetched then, not loaded with the page.
  async function pickTemplate(id: string) {
    // No template: only the findings the doctor dictates.
    if (id === BLANK_TEMPLATE_ID) {
      newCase(BLANK_TEMPLATE);
      return;
    }
    const result = await sendJson<{ template: Template }>("GET", `/api/templates/${id}`);
    if (result.error || !result.data) {
      setError(result.error || "That template could not be opened.");
      toast.error(result.error || "That template could not be opened.");
      return;
    }
    newCase(result.data.template);
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
      router.push(`${future ? "/report" : "/report/classic"}?template=${encodeURIComponent(next.id)}`);
      return;
    }
    setSavedId(null);
    setPatient(null);
    setFinalizedAt(null);
    setDirty(false);
    setTemplate(next);
    setReport(reportFromTemplate(next));
    setInitialDoc(startDoc(next));
    setEditorSeed((seed) => seed + 1);
    setLog([]);
    setWriting(null);
    setFailed(null);
    setDraft("");
    setError("");
    setCopyState("empty");
  }

  // Prints through a hidden frame, so the report page itself stays as it is.
  // "Save as PDF" in the print window gives the PDF.
  async function print() {
    const from = await fullIdentity();
    if (!from) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.srcdoc = printHtml(from);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.append(frame);
  }

  async function copy(next: Report) {
    const from = await fullIdentity();
    if (!from) return;
    const { html, text } = clipboardParts(next, from);
    try {
      await copyReport(html, text);
      setCopyState("copied");
      toast.success("Report copied. Press Ctrl+V in PACS");
    } catch {
      setCopyState("stale");
      setError(COPY_BLOCKED);
      toast.warning("The browser did not let the report copy. Press Copy report again.");
    }
  }

  async function generate(text: string): Promise<Report> {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // The page itself is not needed to write the report.
        template: { ...template, doc: undefined },
        report: reportRef.current,
        dictation: text,
        // So a correction of something said earlier can rewrite that message too.
        earlier: logRef.current.map((entry) => ({ id: entry.id, said: entry.dictation })),
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);

    const ops: PatchOp[] = body.ops;
    let next = applyPatch(reportRef.current, template, ops, body.impression);
    if (future && editorRef.current) {
      // Written into the document too, keeping any formatting the doctor added.
      applying.current = true;
      editorRef.current.applyPatch({ template, ops, impression: body.impression });
      applying.current = false;
      const doc = editorRef.current.getDoc();
      next = { ...docToReport(doc, next), doc };
    }
    reportRef.current = next;
    setReport(next);
    setDirty(true);
    // One credit is one update of the report.
    setCredits((current) => ({ ...current, used: current.used + 1 }));
    const entry = logEntryFor(
      next,
      ops,
      text,
      logRef.current.every((previous) => previous.kind === "unchanged"),
    );
    // The conversation shows what was meant, with the exact words a click away.
    const said = typeof body.said === "string" ? body.said : "";
    if (said && said !== text.trim()) {
      entry.heard = text;
      entry.dictation = said;
    }
    // Earlier messages this one corrected are rewritten; their exact words are kept.
    const revised = new Map<string, string>(
      (Array.isArray(body.revised) ? body.revised : []).map((item: { id: string; said: string }) => [item.id, item.said]),
    );
    setLog((previous) => [
      ...previous.map((earlier) => {
        const said = revised.get(earlier.id);
        if (!said || said === earlier.dictation) return earlier;
        return { ...earlier, dictation: said, heard: earlier.heard ?? earlier.dictation, correctedLater: true };
      }),
      entry,
    ]);
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
      // Short forms become their full text before the report is written.
      dictated = expandMacros(text.trim(), macrosRef.current);
      setWriting(dictated);
      const next = await generate(dictated);
      setDraft("");
      return next;
    });
    // Waits for the signature image too, so a copy is never made without it.
    const output = nextReport.then(async (value) => clipboardParts(value, await identityReady()));

    const copied = writeClipboard(
      output.then((value) => toBlob(value.html, "text/html")),
      output.then((value) => toBlob(value.text, "text/plain")),
    ).then(
        () => true,
        () => false,
      );

    try {
      await nextReport;
      const done = await copied;
      setCopyState(done ? "copied" : "stale");
      if (done) toast.success("Report updated and copied");
      else {
        setError(COPY_BLOCKED);
        toast.warning("Report updated, but not copied. Press Copy report.");
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not update the report.";
      // A dictation that did not reach the report stays in the log, with a way to retry.
      if (dictated) setFailed({ text: dictated, message });
      else setError(message);
      toast.error(dictated ? "Not added to the report. Try again." : message);
    } finally {
      setWriting(null);
      setBusy(false);
    }
  }

  // True when the microphone is on but no voice has been heard for a few seconds.
  const [quiet, setQuiet] = useState(false);

  // The floating window comes up only when the doctor leaves this tab while
  // the microphone is on, and goes away when they come back.
  const floating = useFloatingWindow(floatingBox && dictation.recording);

  function toggleMic() {
    setQuiet(false);
    if (!dictation.recording) {
      if (lineVoice.live) lineVoice.stop();
      if (editorVoice.live) editorVoice.stop();
      listener.current = spokenStream();
      dictation.start();
      return;
    }
    // Stop, wait for the last words, then update the report in one step.
    send(
      dictation.stop().then(() => {
        // Words held back in case a phrase carried on are written now.
        apply(listener.current.flush());
        return draftRef.current;
      }),
    );
  }

  // After 5 seconds with no voice the microphone switches off by itself and
  // goes back to Start. What was said stays in the box as a draft: nothing is
  // sent to the report until the doctor presses Enter or the send button.
  function pauseMic() {
    if (!dictation.recording) return;
    dictation
      .stop()
      .then(() => {
        apply(listener.current.flush());
        if (draftRef.current.trim()) {
          toast.warning("Paused after 5 seconds of silence. Press Enter or Send when ready.");
        }
      })
      .catch(() => {});
  }
  function onSilence(silent: boolean) {
    setQuiet(silent);
    if (silent) pauseMic();
  }

  // Keyboard shortcuts. The handlers are read through a ref so the listener
  // is attached once and still calls the latest version of each action.
  const actions = useRef<Record<ShortcutAction, () => void>>(null);
  useEffect(() => {
    // Same limits as the buttons: nothing fires while a report is being written.
    actions.current = {
      dictate: () => !busy && !dictation.starting && toggleMic(),
      copy: () => !busy && copy(report),
      save: () => !busy && !saving && (savedId === null || dirty) && requestSave(),
      print: () => !busy && print(),
      new: () => !busy && newCase(),
    };
  });
  const floatingWindow = floating.win;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const combo = comboFromEvent(event);
      if (!combo || event.repeat) return;
      const match = (Object.keys(shortcuts) as ShortcutAction[]).find((id) => shortcuts[id] === combo);
      if (!match) return;
      event.preventDefault();
      actions.current?.[match]();
    }
    // The floating window has its own keyboard, so it listens too.
    const targets = floatingWindow ? [window, floatingWindow] : [window];
    for (const target of targets) target.addEventListener("keydown", onKey);
    return () => {
      for (const target of targets) target.removeEventListener("keydown", onKey);
    };
  }, [shortcuts, floatingWindow]);

  // Typed edits: recopy shortly after the radiologist stops typing.
  const editTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function edited(next: Report) {
    setReport(next);
    setDirty(true);
    setCopyState("stale");
    clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => copy(next), 500);
  }

  function editorChanged(doc: DocNode) {
    const next = { ...docToReport(doc, reportRef.current), doc };
    reportRef.current = next;
    if (applying.current) setReport(next);
    else edited(next);
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

  /** Starts an empty line under another one, for "next line" while speaking into a line. Returns its key. */
  function addLineAfter(sectionId: string, lineId: string) {
    const id = `${sectionId}.${crypto.randomUUID().slice(0, 8)}`;
    edited({
      ...report,
      sections: report.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const lines = [...section.lines];
        const at = lines.findIndex((line) => line.id === lineId);
        lines.splice(at + 1, 0, { id, text: "", status: "edited", warnings: [] });
        return { ...section, lines };
      }),
    });
    return `${sectionId}/${id}`;
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
    const message = messageRef.current;
    if (message && dictation.recording) message.scrollTop = message.scrollHeight;
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

  const floatingPortal = floating.win && (
      <FloatingBox
        win={floating.win}
        status={status}
        words={shownWords}
        note={copyState === "copied" ? "Report updated and copied. Press Ctrl+V in PACS." : ""}
        problem={failed?.message || error || dictation.error}
        onType={setDraft}
        onMic={toggleMic}
        onSend={() => send(Promise.resolve(draft))}
      />
  );

  const dialogs = (
    <>
      <FinalizeDialog
        open={showFinal}
        onClose={() => setShowFinal(false)}
        printHtml={showFinal ? printHtml() : ""}
        finalizedAt={finalizedAt}
        hasLetterhead={identity.letterheadEnabled && Boolean(identity.headerImage || identity.footerImage)}
        hasSignature={Boolean(identity.signatureText.trim() || identity.signatureImage)}
        flaggedLines={flaggedLines}
        copied={copyState === "copied"}
        onPrint={print}
        onCopy={() => copy(report)}
      />

      <PatientDialog
        open={patientAsk !== null}
        initial={patientDraft}
        purpose={patientAsk ?? "save"}
        busy={saving}
        onCancel={() => {
          afterSave.current = null;
          setPatientAsk(null);
        }}
        onSubmit={submitPatient}
      />

      <Dialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#06110f]/50" />
          <Dialog.Popup className="app-layer sheet fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(6_17_15/0.55)] outline-none sm:p-8">
            <Dialog.Title className="text-[1.4rem] font-semibold tracking-[-0.02em]">
              Discard this draft?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-[1.02rem] leading-relaxed text-ink-soft">
              {savedId
                ? "You changed this report after saving it. Starting a new one loses those changes."
                : "This draft is not saved. Starting a new report loses it."}
            </Dialog.Description>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => pending && startNew(pending)}
                className={`${buttonClass.danger} h-12`}
              >
                Discard draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const next = pending;
                  if (!next) return;
                  setPending(null);
                  requestSave(() => startNew(next));
                }}
                className={`${buttonClass.secondary} h-12`}
              >
                <FloppyDisk weight="bold" className="h-5 w-5" />
                {saving && <Spinner />}
                {saving ? "Saving" : "Save first"}
              </button>
              <Dialog.Close className={`${buttonClass.quiet} h-12`}>Keep editing</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );

  // The new design's message box sizes itself, so it has its own ref.
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const remaining = credits.limit === null ? null : Math.max(0, credits.limit - credits.used);
  // The account menu shows this count; keep it in step as updates are used.
  useEffect(() => setUpdatesLeft(remaining), [remaining]);
  // Full screen: the report alone in the middle, the menu hidden, and the AI
  // Assistant shrunk to a floating box that can be made bigger.
  const [fullScreen, setFullScreen] = useState(false);
  const [assistantBig, setAssistantBig] = useState(false);
  function toggleFullScreen() {
    const next = !fullScreen;
    setFullScreen(next);
    setAssistantBig(false);
    // The browser's own full screen too, where it is allowed; the layout works without it.
    if (next && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    if (!next && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    const root = document.documentElement;
    if (fullScreen) root.dataset.reportFocus = "";
    else delete root.dataset.reportFocus;
    // Leaving the browser's full screen with Escape leaves this one too.
    const left = () => !document.fullscreenElement && setFullScreen(false);
    document.addEventListener("fullscreenchange", left);
    return () => {
      document.removeEventListener("fullscreenchange", left);
      delete root.dataset.reportFocus;
    };
  }, [fullScreen]);
  const timeOf = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  // Both halves are the same kind of object: a white card on the grey canvas.
  const CARD =
    "flex min-h-0 flex-col overflow-clip rounded-[28px] border border-line bg-surface shadow-[0_1px_2px_rgb(10_13_12/0.05),0_22px_60px_-34px_rgb(10_13_12/0.4)]";
  // Round icon tools with no outline; a soft grey circle shows on hover.
  const TOOL =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.07] disabled:opacity-40";
  const ICON_BUTTON =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-40";

  if (future) {
    return (
      <main
        // On a phone the report has the screen; room is left at the bottom for the docked AI Assistant.
        className="flex min-w-0 flex-1 flex-col gap-4 p-3 max-lg:pb-[calc(17rem+env(safe-area-inset-bottom))] sm:p-4 sm:max-lg:pb-[calc(17rem+env(safe-area-inset-bottom))] lg:h-[100dvh] lg:flex-none lg:flex-row lg:overflow-clip">
        {/* The report. */}
        <section
          aria-label="Report"
          className={`${CARD} order-2 min-h-[70dvh] min-w-0 flex-1 lg:order-1 lg:min-h-0 ${fullScreen ? "lg:mx-auto lg:max-w-[72rem]" : ""}`}
        >
          {/* A draft document: who it is for on the left, with the template it
              started from as a quiet detail; actions on the right in two groups,
              output (print, copy) and keeping it (save, finalize). */}
          <header className="@container shrink-0 border-b border-line px-4 py-2">
            <div className="flex items-center gap-3">
              {/* New report first, then the document's label. */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Tip label="New report">
                  <button type="button" onClick={() => newCase()} aria-label="New report" className={`${ICON_BUTTON} shrink-0`}>
                    <Plus weight="bold" className="h-5 w-5" />
                  </button>
                </Tip>
                {/* The document's label: who it is for, and beneath it the draft state
                    and the template it started from, as small details. */}
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  {/* The patient: a label on the document, not its headline. */}
                  <Tip label={hasPatient(patient) ? "Change patient details" : "Add patient details"}>
                    <button
                      type="button"
                      onClick={() => setPatientAsk("edit")}
                      className="-mx-1.5 flex min-w-0 max-w-full items-baseline gap-2 self-start rounded-md px-1.5 text-left transition-colors hover:bg-ink/[0.05]"
                    >
                      {hasPatient(patient) ? (
                        <>
                          <span className="truncate text-[0.95rem] font-semibold text-ink">{patient.name}</span>
                          {ageSex(patient) && (
                            <span className="shrink-0 text-[0.88rem] text-ink-soft">{ageSex(patient)}</span>
                          )}
                        </>
                      ) : (
                        <span className="whitespace-nowrap text-[0.95rem] font-semibold text-ink-quiet">New patient</span>
                      )}
                    </button>
                  </Tip>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded px-1.5 py-px text-[0.68rem] font-bold uppercase tracking-[0.06em] ${
                        savedId && !dirty ? "bg-teal/[0.12] text-teal-deep" : "bg-ink/[0.07] text-ink-soft"
                      }`}
                      title={
                        finalizedAt && !dirty
                          ? "Finalized"
                          : finalizedAt
                            ? "Changed after finalizing"
                            : savedId && !dirty
                              ? "Saved as a draft"
                              : savedId
                                ? "Changes not saved"
                                : "Not saved yet"
                      }
                    >
                      {/* Draft until saved; changes after a save make it a draft again until saved. */}
                      {finalizedAt && !dirty ? "Final" : savedId && !dirty ? "Saved" : "Draft"}
                    </span>
                    <TemplatePicker
                      current={template}
                      onPick={pickTemplate}
                      // Where the draft started: a small detail under the patient, not its name.
                      className="!h-6 min-w-0 max-w-[14rem] !gap-1 !rounded-md !border-transparent !bg-transparent !px-1 !text-[0.82rem] !font-medium !text-ink-soft hover:!bg-ink/[0.05] hover:!text-ink data-[popup-open]:!bg-ink/[0.06] [&>svg]:!h-3 [&>svg]:!w-3"
                    />
                  </div>
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1">
                {/* Output: any time, nothing asked. */}
                <Tip label="Print or PDF" shortcut={shortcuts.print.replace(/\+/g, " + ")}>
                  <button type="button" onClick={print} disabled={busy} aria-label="Print or PDF" className={TOOL}>
                    <Printer weight="bold" className="h-5 w-5" />
                  </button>
                </Tip>
                <Tip label="Copy report" shortcut={shortcuts.copy.replace(/\+/g, " + ")}>
                  <button
                    type="button"
                    onClick={() => copy(report)}
                    disabled={busy}
                    aria-label="Copy report"
                    className={TOOL}
                  >
                    <Copy weight="bold" className="h-5 w-5" />
                  </button>
                </Tip>
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-ink/20" />
                {/* Keeping it: the patient's details are asked for here. */}
                <Tip label={savedId ? "Save changes" : "Save"} shortcut={shortcuts.save.replace(/\+/g, " + ")}>
                  <button
                    type="button"
                    onClick={() => requestSave()}
                    disabled={saving || busy || (savedId !== null && !dirty)}
                    className="inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-ink/[0.07] disabled:text-ink-quiet disabled:hover:bg-transparent"
                  >
                    {saving && patientAsk === null ? <Spinner /> : <FloppyDisk weight="bold" className="h-5 w-5" />}
                    <span className="hidden @[52rem]:inline">{savedId && !dirty ? "Saved" : "Save"}</span>
                  </button>
                </Tip>
                {/* Finalize opens, and stands out, once the AI Assistant has worked on the report. */}
                <Tip
                  label={
                    finalizedAt && !dirty
                      ? "Finalized: view it as it prints"
                      : readyToFinalize
                        ? "Finalize: check details, save as final"
                        : "Finalize opens once the AI Assistant has updated the report"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (finalizedAt && !dirty) setShowFinal(true);
                      else if (readyToFinalize) finalize();
                    }}
                    disabled={saving || busy}
                    aria-disabled={!readyToFinalize}
                    className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-[0.95rem] font-bold transition-colors disabled:opacity-60 @[40rem]:px-4 ${
                      readyToFinalize
                        ? "bg-btn text-btn-text hover:bg-teal-deep"
                        : "cursor-default bg-ink/[0.06] text-ink-quiet"
                    }`}
                  >
                    <SealCheck weight={finalizedAt && !dirty ? "fill" : "bold"} className="h-5 w-5" />
                    <span className="hidden @[40rem]:inline">{finalizedAt && !dirty ? "Finalized" : "Finalize"}</span>
                  </button>
                </Tip>
                <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-ink/20 lg:block" />
                <Tip label={fullScreen ? "Exit full screen" : "Full screen"}>
                  <button
                    type="button"
                    onClick={toggleFullScreen}
                    aria-pressed={fullScreen}
                    aria-label={fullScreen ? "Exit full screen" : "Full screen"}
                    className={`${TOOL} hidden lg:grid`}
                  >
                    {fullScreen ? <CornersIn weight="bold" className="h-5 w-5" /> : <CornersOut weight="bold" className="h-5 w-5" />}
                  </button>
                </Tip>
              </div>
            </div>
          </header>

          {flaggedLines > 0 && (
            <p
              role="alert"
              className="flex shrink-0 items-center gap-2 border-b border-flag/30 bg-flag/10 px-5 py-2 text-[0.95rem] font-semibold text-flag"
            >
              <WarningCircle weight="fill" className="h-5 w-5 shrink-0" />
              {flaggedLines} {flaggedLines === 1 ? "line needs" : "lines need"} checking before you sign.
            </p>
          )}

          {/* The report editor: every line can be edited and formatted. */}
          <ReportEditor
            key={editorSeed}
            ref={editorRef}
            variant="embedded"
            initialDoc={initialDoc}
            profile={profile}
            onChange={editorChanged}
            overlay={(editor) => editorVoice.render(editor, lineVoiceBlocked)}
            footer={
              // The sign-off travels with every copy and print. It is set in Settings.
              (signature.image || signature.text) && (
                <div className="mt-8" aria-label="Your signature">
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
              )
            }
          />
        </section>

        {/* Dictation: a conversation. The doctor's words on the right, what
            LumenAI did with them on the left. */}
        {/* In full screen it floats in the corner, small until made bigger. */}
          <section
            ref={panelRef}
            aria-label="AI Assistant"
            // On a phone or tablet it docks at the bottom of the screen: the speak
            // controls always in reach, the chat pulled up as a sheet when wanted.
            className={`${CARD} order-1 w-full shrink-0 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-[0_-14px_34px_-20px_rgb(6_17_15/0.45)] lg:order-2 lg:max-w-[24.75rem] xl:max-w-[25.75rem] ${
              assistantBig ? "max-lg:h-[85dvh]" : ""
            } ${
              fullScreen
                ? `lg:fixed lg:bottom-5 lg:right-5 lg:z-40 lg:!shadow-[0_30px_80px_-24px_rgb(10_13_12/0.55)] ${
                    assistantBig ? "lg:h-[min(46rem,calc(100dvh-6.75rem))]" : ""
                  }`
                : ""
            }`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3 max-lg:py-2">
              <h1 className="text-[1.25rem] font-bold tracking-[-0.02em] max-lg:text-[1.05rem]">AI Assistant</h1>
              {/* The microphone button says what is happening, so this corner holds the panel's own actions. */}
              <div className="flex items-center gap-1">
                {/* On a phone this opens the chat as a sheet; in full screen it makes the floating box bigger. */}
                {
                  <Tip label={assistantBig ? "Make smaller" : "Make bigger"}>
                    <button
                      type="button"
                      onClick={() => setAssistantBig((big) => !big)}
                      aria-pressed={assistantBig}
                      aria-label={assistantBig ? "Make smaller" : "Make bigger"}
                      className={`h-10 place-items-center rounded-full px-3 text-ink transition-colors hover:bg-ink/[0.08] max-lg:bg-ink/[0.06] lg:w-10 lg:px-0 ${
                        fullScreen ? "grid" : "grid lg:hidden"
                      }`}
                    >
                      {/* Phone: a "Chat" pill that pulls the conversation up or down. */}
                      <span className="flex items-center gap-1 text-[0.9rem] font-semibold lg:hidden">
                        Chat
                        <CaretDown weight="bold" className={`h-4 w-4 transition-transform ${assistantBig ? "" : "rotate-180"}`} />
                      </span>
                      <span className="hidden lg:block">
                        {assistantBig ? (
                          <ArrowsInSimple weight="bold" className="h-5 w-5" />
                        ) : (
                          <ArrowsOutSimple weight="bold" className="h-5 w-5" />
                        )}
                      </span>
                    </button>
                  </Tip>
                }
                <AssistantMenu
                  getDoc={() => editorRef.current?.getDoc()}
                  suggestedName={`${template.name} copy`}
                  canClear={log.length > 0}
                  onClear={() => setLog([])}
                />
              </div>
            </header>

            {floatingPortal}

            <ol
              className={`flex max-h-72 min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain bg-ink/[0.025] px-5 py-5 lg:max-h-none ${
                fullScreen && !assistantBig ? "lg:hidden" : ""
              } ${
                // On a phone the chat shows only when pulled up.
                assistantBig ? "" : "max-lg:hidden"
              }`}
            >
              {log.length === 0 && !writing && !failed && (
                <li className="m-auto flex max-w-[18rem] flex-col items-center gap-2 py-6 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-teal/[0.12] text-teal-deep">
                    <Microphone weight="fill" className="h-6 w-6" />
                  </span>
                  <p className="text-[1.02rem] font-semibold">Say only what is abnormal</p>
                  <p className="text-[0.92rem] text-ink-soft">Everything you do not mention stays normal.</p>
                </li>
              )}

              {log.map((entry) => {
                const flagged = entry.changes.filter((change) => change.flagged).length;
                const open = openEntry === entry.id;
                return (
                  <li key={entry.id} className="flex flex-col gap-2">
                    <p className="t-meta text-center">{timeOf(entry.at)}</p>
                    {/* What the doctor said. */}
                    <p className="ml-9 self-end whitespace-pre-line rounded-[1.1rem] rounded-br-md bg-amber-tint px-3.5 py-2 text-[0.94rem] leading-snug text-ink shadow-[inset_0_0_0_1px_rgb(122_76_5/0.18)]">
                      {exactWords === entry.id && entry.heard ? entry.heard : entry.dictation}
                    </p>
                    {/* Tidied by the AI: corrections applied, false starts dropped. */}
                    {entry.heard && (
                      <button
                        type="button"
                        onClick={() => setExactWords((shown) => (shown === entry.id ? null : entry.id))}
                        className="-mt-1 mr-1 self-end text-[0.82rem] font-semibold text-ink-soft underline decoration-ink/30 underline-offset-2 hover:text-ink"
                      >
                        {exactWords === entry.id
                          ? "Show as meant"
                          : `${entry.correctedLater ? "Corrected later" : "Tidied"} · Show exact words`}
                      </button>
                    )}
                    {/* What happened to the report. */}
                    {/* The AI's reply, marked with the assistant's sparkle. */}
                    <div className="mr-9 flex items-start gap-2 self-start">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          flagged ? "bg-flag/10 text-flag" : "bg-teal/[0.12] text-teal-deep"
                        }`}
                      >
                        <Sparkle weight="fill" className="h-4 w-4" />
                      </span>
                      <div
                        className={`rounded-[1.1rem] rounded-tl-md border px-3.5 py-2 leading-snug ${
                          flagged ? "border-flag/50 bg-flag/[0.08]" : "border-line bg-surface"
                        }`}
                      >
                        <p className={`text-[0.9rem] font-semibold ${flagged ? "text-flag" : "text-ink"}`}>
                          {flagged
                            ? `${flagged} ${flagged === 1 ? "line" : "lines"} to check`
                            : entry.kind === "created"
                              ? "Report created"
                              : entry.kind === "updated"
                                ? "Report updated"
                                : "Nothing to change"}
                        </p>
                        {entry.changes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setOpenEntry(open ? null : entry.id)}
                            aria-expanded={open}
                            className="flex items-center gap-1 text-[0.85rem] text-ink-soft hover:text-ink"
                          >
                            {entry.changes.length} {entry.changes.length === 1 ? "line" : "lines"} changed
                            <CaretDown weight="bold" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                          </button>
                        )}
                        {open && entry.changes.length > 0 && (
                          <ul className="mt-1.5 flex flex-col gap-1">
                            {entry.changes.map((change, index) => (
                              <li key={index} className="text-[0.85rem] leading-snug">
                                <span className="font-bold">{tidyHeading(change.heading)}: </span>
                                <span className={change.flagged ? "text-flag" : "text-ink-soft"}>{change.text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}

              {writing && (
                <li className="flex flex-col gap-2">
                  <p className="ml-9 self-end whitespace-pre-line rounded-[1.1rem] rounded-br-md bg-amber-tint px-3.5 py-2 text-[0.94rem] leading-snug text-ink">
                    {writing}
                  </p>
                  <div className="mr-9 flex items-start gap-2 self-start">
                    <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal/[0.12] text-teal-deep">
                      <Sparkle weight="fill" className="h-4 w-4 animate-pulse" />
                    </span>
                    <p className="flex items-center gap-2 rounded-[1.1rem] rounded-tl-md border border-line bg-surface px-3.5 py-2 text-[0.9rem] font-semibold text-ink-soft">
                      <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                      Writing into the report
                    </p>
                  </div>
                </li>
              )}

              {failed && (
                <li role="alert" className="flex flex-col gap-2">
                  <p className="ml-9 self-end whitespace-pre-line rounded-[1.1rem] rounded-br-md bg-amber-tint px-3.5 py-2 text-[0.94rem] leading-snug text-ink">
                    {failed.text}
                  </p>
                  <div className="mr-9 self-start rounded-[1.1rem] rounded-tl-md border border-flag/50 bg-flag/[0.08] px-3.5 py-2">
                    <p className="text-[0.9rem] font-semibold text-flag">Not added to the report</p>
                    <p className="text-[0.85rem] text-flag">{failed.message}</p>
                    <button
                      type="button"
                      onClick={() => send(Promise.resolve(failed.text))}
                      disabled={busy || dictation.recording}
                      className={`${buttonClass.secondary} mt-2 h-10`}
                    >
                      <ArrowsClockwise weight="bold" className="h-4 w-4" />
                      Try again
                    </button>
                  </div>
                </li>
              )}
              <div ref={logEnd} />
            </ol>


            {/* One box to speak or type into, like a message box. */}
            <div className="flex shrink-0 flex-col gap-2.5 border-t border-line p-4">
              {dictation.access === "blocked" && !error && !dictation.error && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl border border-flag/50 bg-flag/10 px-3.5 py-2.5 text-[0.92rem] font-semibold text-flag">
                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                  {MICROPHONE_MESSAGES.blocked}
                </p>
              )}
              {(error || dictation.error) && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl border border-flag/50 bg-flag/10 px-3.5 py-2.5 text-[0.92rem] font-semibold text-flag">
                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                  {error || dictation.error}
                </p>
              )}
              {dictation.access === "ask" && !dictation.error && !error && (
                <p className="flex items-start gap-2 rounded-2xl bg-ink/[0.05] px-3.5 py-2.5 text-[0.92rem] leading-snug">
                  <Info weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  {MICROPHONE_MESSAGES.ask}
                </p>
              )}

              {/* The message box. While listening its edge becomes a slowly turning colour line. */}
              <div
                className={`rounded-[1.5rem] p-[2px] transition-colors ${
                  status === "listening" ? "voice-ring" : "bg-ink/25 focus-within:bg-teal"
                }`}
              >
                <div className="rounded-[calc(1.5rem-2px)] bg-surface p-2">
                  <textarea
                    ref={messageRef}
                    value={shownWords}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (!busy && !dictation.recording && draft.trim()) send(Promise.resolve(draft));
                      }
                    }}
                    readOnly={dictation.recording || dictation.starting}
                    aria-label="What you said"
                    placeholder={
                        status === "starting"
                          ? "Please wait…"
                          : status === "listening"
                            ? "Talk now. Your words appear here."
                            : "Speak your findings, or type them here"
                      }
                    // The rounded box around it shows focus; the app-wide ring would draw a second box.
                    style={{ outline: "none" }}
                    // Grows with the words, up to a few lines, then scrolls.
                    className="max-h-40 min-h-16 w-full resize-none bg-transparent px-3 pt-2 [field-sizing:content] text-[1.02rem] leading-relaxed text-ink outline-none placeholder:text-ink-quiet"
                  />
                </div>
              </div>

              {/* Below the box, apart from its edge: speak on the left, send typed words on the right. */}
              <div className="flex items-center gap-3">
                <VoiceButton
                  status={status}
                  readLevel={dictation.readLevel}
                  onQuiet={onSilence}
                  onClick={toggleMic}
                  disabled={busy || dictation.starting}
                  keyShortcut={shortcuts.dictate}
                  className="min-w-0 flex-1"
                />
                {/* Faded until something is typed. */}
                <Tip label="Update report from typed text">
                  <button
                    type="button"
                    onClick={() => send(Promise.resolve(draft))}
                    disabled={busy || dictation.recording || dictation.starting || draft.trim() === ""}
                    aria-label="Update report from typed text"
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-white transition-[opacity,filter] hover:brightness-110 disabled:cursor-default disabled:opacity-25 disabled:hover:brightness-100"
                  >
                    <ArrowUp weight="bold" className="h-5 w-5" />
                  </button>
                </Tip>
              </div>

              {heard ? (
                <p role="status" className="flex items-center justify-center gap-2 text-center text-[0.95rem] font-bold text-teal-deep">
                  <CheckCircle weight="fill" className="h-5 w-5" />
                  {heard}
                </p>
              ) : status === "listening" ? (
                <>
                  <p className="t-meta -mt-1 text-center">
                    Say “next line”, “full stop”, “comma”, “delete last macro” or “undo that”.
                  </p>
                </>
              ) : null}
            </div>
          </section>

        {dialogs}
      </main>
    );
  }

  // On a laptop the workspace is exactly one screen tall: the report scrolls
  // inside its column and the dictation panel never moves.
  return (
    <main className="flex min-w-0 flex-1 flex-col lg:h-[100dvh] lg:flex-none lg:flex-row lg:overflow-hidden">
      {/* The report: what will be pasted into PACS. */}
      <section className="order-2 flex min-w-0 flex-1 flex-col lg:order-1 lg:overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
            <span aria-hidden="true">Template</span>
            <TemplatePicker current={template} onPick={pickTemplate} />
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
                  {finalizedAt && !dirty ? (
                    <>
                      <SealCheck weight="fill" className="h-5 w-5 text-teal" />
                      Finalized {formatDateTime(finalizedAt)}
                    </>
                  ) : savedId && !dirty ? (
                    <>
                      <CheckCircle weight="fill" className="h-5 w-5 text-teal" />
                      Saved as draft
                    </>
                  ) : finalizedAt ? (
                    "Changed after finalizing"
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
              onClick={() => requestSave()}
              disabled={saving || busy || (savedId !== null && !dirty)}
              className={buttonClass.secondary}
            >
              <FloppyDisk weight="bold" className="h-5 w-5" />
              {saving && <Spinner />}
              {saving ? "Saving" : "Save"}
            </button>
            <button type="button" onClick={() => copy(report)} disabled={busy} className={buttonClass.secondary}>
              <Copy weight="bold" className="h-5 w-5" />
              Copy report
            </button>
            {/* The last step of every report: saves it as final and shows it as it prints. */}
            <button
              type="button"
              onClick={finalize}
              disabled={saving || busy}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-teal px-6 text-[0.95rem] font-bold text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SealCheck weight="fill" className="h-5 w-5" />
              {saving ? "Saving" : finalizedAt && !dirty ? "Finalized" : "Finalize"}
            </button>
          </div>

              <h1 className="text-center text-[1.05rem] font-bold">{report.title}</h1>

              {report.sections.map((section) => (
                <div key={section.id} className="mt-6">
                  <h2 className="px-2.5 font-bold">{section.heading}:</h2>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {section.lines.map((line) => {
                      const changed = line.status !== "normal";
                      const flagged = line.warnings.length > 0;
                      const voiceKey = `${section.id}/${line.id}`;
                      return (
                        <li
                          key={line.id}
                          className={`relative rounded-xl ${
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
                            {...lineVoice.bind(
                              voiceKey,
                              (text) => editLine(section.id, line.id, text),
                              () => addLineAfter(section.id, line.id),
                            )}
                          />
                          {lineVoice.button(voiceKey, lineVoiceBlocked)}
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
                <div className="relative mt-1.5">
                  <textarea
                    value={report.impression.join("\n")}
                    onChange={(event) =>
                      edited({ ...report, impression: event.target.value.split("\n") })
                    }
                    rows={Math.max(1, report.impression.length)}
                    aria-label="Impression"
                    className={`${lineClass} ${hasFindings ? "font-bold" : ""}`}
                    {...lineVoice.bind("impression", (text) => edited({ ...report, impression: text.split("\n") }))}
                  />
                  {lineVoice.button("impression", lineVoiceBlocked)}
                </div>
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
              Click any line to change it by hand, or press Speak at the cursor to add words by voice.
            </p>
          </div>
        </div>
      </section>

      {/* Dictation: always in view on a laptop screen, beside the report. */}
      <aside
        ref={panelRef}
        aria-label="AI Assistant"
        className="order-1 flex shrink-0 flex-col border-b border-line bg-surface lg:order-2 lg:h-full lg:w-[25rem] lg:border-b-0 lg:border-l xl:w-[27rem]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 lg:h-[4.25rem]">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">AI Assistant</h2>
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

        {floatingPortal}

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
                <h3 className="t-label">Report log</h3>
                <span className="t-meta">
                  {log.length} {log.length === 1 ? "dictation" : "dictations"}
                </span>
              </div>

              <ol aria-live="polite" className="flex flex-col gap-3">
                {log.map((entry) => {
                  const flagged = entry.changes.filter((change) => change.flagged).length;
                  const open = openEntry === entry.id;
                  const unchanged = entry.kind === "unchanged";
                  return (
                    <li key={entry.id} className="rounded-2xl border border-ink/25 bg-surface">
                      {/* Opens the list of changed lines. With nothing changed there is
                          nothing to open, so it is plain text with no arrow. */}
                      <button
                        type="button"
                        onClick={() => setOpenEntry(open ? null : entry.id)}
                        aria-expanded={entry.changes.length > 0 ? open : undefined}
                        disabled={entry.changes.length === 0}
                        className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors enabled:hover:bg-ink/[0.05]"
                      >
                        {/* Colour says how it went: teal done, red needs a look, grey nothing happened. */}
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                            flagged > 0
                              ? "bg-flag text-white"
                              : unchanged
                                ? "bg-ink/[0.08] text-ink-quiet"
                                : "bg-teal text-white"
                          }`}
                        >
                          {flagged > 0 ? (
                            <WarningCircle weight="fill" className="h-5 w-5" />
                          ) : unchanged ? (
                            <Minus weight="bold" className="h-5 w-5" />
                          ) : entry.kind === "created" ? (
                            <Sparkle weight="fill" className="h-5 w-5" />
                          ) : (
                            <Check weight="bold" className="h-5 w-5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[1.05rem] font-bold leading-snug text-ink">
                            {unchanged
                              ? "Nothing changed"
                              : entry.kind === "created"
                                ? "Report created"
                                : "Report updated"}
                          </span>
                          <span className="t-meta block">{formatDateTime(entry.at)}</span>
                        </span>
                        {entry.changes.length > 0 && (
                          <span className="t-meta flex shrink-0 items-center gap-1.5">
                            {open ? "Hide" : "Show"} changes
                            <CaretDown
                              weight="bold"
                              className={`h-4 w-4 text-ink transition-transform ${open ? "rotate-180" : ""}`}
                            />
                          </span>
                        )}
                      </button>

                      {open && entry.changes.length > 0 && (
                        <ul className="mx-3.5 mb-3.5 flex flex-col gap-2.5 rounded-xl border border-line bg-ink/[0.03] px-3.5 py-3">
                          {entry.changes.map((change, index) => (
                            <li key={index} className="flex flex-col items-start gap-1.5">
                              <span className="t-label">{tidyHeading(change.heading)}</span>
                              <p
                                className={`flex items-start gap-1.5 text-[0.98rem] leading-snug ${
                                  change.flagged ? "font-semibold text-flag" : "text-ink"
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

                      <div className="px-3.5 pb-3.5">
                        <p className="t-label mb-1.5 flex items-center gap-1.5">
                          <Microphone weight="fill" className="h-3.5 w-3.5 text-amber-deep" />
                          You said
                        </p>
                        <p className="t-speech">{entry.dictation}</p>
                      </div>

                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line px-3.5 py-2.5">
                        {unchanged ? (
                          <span className="text-[0.92rem] text-ink-soft">
                            The report was left as it was. Say the finding again if something should change.
                          </span>
                        ) : (
                          <>
                            <span className="text-[0.92rem] font-bold text-ink">
                              {entry.changes.length} {entry.changes.length === 1 ? "line" : "lines"} changed
                            </span>
                            {flagged > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-flag px-2.5 py-0.5 text-[0.85rem] font-bold text-white">
                                <WarningCircle weight="fill" className="h-4 w-4" />
                                {flagged} to check
                              </span>
                            ) : (
                              <span className="t-meta inline-flex items-center gap-1.5">
                                <ShieldCheck weight="fill" className="h-4 w-4 text-teal" />
                                Checked, no problems
                              </span>
                            )}
                          </>
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
                    <p className="t-speech mt-2.5 !bg-surface">{writing}</p>
                  </li>
                )}

                {failed && (
                  <li role="alert" className="rounded-2xl border-2 border-flag bg-flag/10 px-3.5 py-3">
                    <p className="flex items-center gap-2.5 text-[1rem] font-semibold text-flag">
                      <WarningCircle weight="fill" className="h-5 w-5" />
                      Not added to the report
                    </p>
                    <p className="mt-1 text-[0.92rem] font-semibold text-flag">{failed.message}</p>
                    <p className="t-speech mt-2.5 !bg-surface">{failed.text}</p>
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
            placeholder="Press Start speaking and say your findings. Your words appear here. You can also type."
            className={`w-full resize-none rounded-2xl border-2 bg-surface px-4 py-3 text-[1.02rem] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-quiet ${
              dictation.recording ? "border-flag" : "border-ink/35 focus:border-teal"
            }`}
          />

          {/* Says what is happening while something is. Nothing to say when idle:
              the box above already tells a newcomer what to do. */}
          {/* A spoken command is acted on, not written, so say that it was heard. */}
          {heard && (
            <p role="status" className="flex items-center justify-center gap-2 text-center text-[0.98rem] font-bold text-teal-deep">
              <CheckCircle weight="fill" className="h-5 w-5" />
              {heard}
            </p>
          )}
          <p
            role="status"
            hidden={status === "ready" || Boolean(heard)}
            className={`flex min-h-6 items-center justify-center gap-2 text-center text-[0.98rem] font-bold ${
              status === "listening"
                ? quiet
                  ? "text-amber-deep"
                  : "text-flag"
                : status === "ready"
                  ? "text-ink-quiet"
                  : "text-amber-deep"
            }`}
          >
            {status === "starting" && "Please wait. Turning on the microphone."}
            {status === "listening" && !quiet && "Speak now. I am listening."}
            {status === "listening" && quiet && "I cannot hear you. Speak closer to the microphone."}
            {status === "writing" && "Please wait. Writing your report."}
          </p>
          {status === "listening" && !heard && (
            <p className="t-meta -mt-1 text-center">
              Say “next line”, “full stop”, “comma”, “delete last macro” or “undo that”.
            </p>
          )}

          <VoiceButton
            status={status}
            readLevel={dictation.readLevel}
            onQuiet={onSilence}
            onClick={toggleMic}
            disabled={busy || dictation.starting}
            keyShortcut={shortcuts.dictate}
            className="w-full"
          />

          {/* Only for typed words. Speech is sent by the button above, so this
              stays out of the way until there is something typed to send. */}
          {draft.trim() !== "" && !dictation.recording && (
            <button
              type="button"
              onClick={() => send(Promise.resolve(draft))}
              disabled={busy}
              className="h-11 rounded-full border border-ink/35 text-[0.95rem] font-bold text-ink transition-colors hover:border-ink/60 hover:bg-ink/[0.06] disabled:opacity-60"
            >
              Update report from typed text
            </button>
          )}
        </div>
      </aside>

      {dialogs}
    </main>
  );
}
