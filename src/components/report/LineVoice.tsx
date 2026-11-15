"use client";

import { Microphone, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spinner } from "@/components/Spinner";
import { expandMacros, removeLastMacro, type Macro } from "@/lib/macros";
import { useDictation, type Word } from "@/lib/useDictation";
import { COMMAND_LABELS, hasCorrection, resolveCorrections, spokenStream, type SpokenPiece } from "@/lib/voiceCommands";
import { VoiceMeter } from "./VoiceMeter";

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Where the button sits inside the line, in pixels from its top left corner. */
type Spot = { left: number; top: number };

const BUTTON_HEIGHT = 32;
// Wide enough for the listening state, so the button never runs off the line.
const BUTTON_WIDTH = 132;

/**
 * Where the text cursor is drawn inside a text box. A text box does not say
 * this itself, so a hidden copy with the same text and styles is measured.
 */
function caretPoint(field: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(field);
  const mirror = document.createElement("div");
  const copied = [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderStyle",
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
    "textTransform", "wordSpacing", "textIndent", "tabSize",
  ] as const;
  for (const property of copied) mirror.style[property] = style[property];
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });
  mirror.textContent = field.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.append(marker);
  document.body.append(mirror);
  const point = {
    left: marker.offsetLeft,
    top: marker.offsetTop - field.scrollTop,
    height: parseFloat(style.lineHeight) || marker.offsetHeight,
  };
  mirror.remove();
  return point;
}

/**
 * Spoken words shaped to sit between the text before and after the cursor:
 * spaced, and cased to read as part of the sentence. `words` is the text to
 * place after `lead` and before `trail`; null when nothing was said.
 */
export function shapeWords(before: string, after: string, spoken: string) {
  let words = spoken.trim();
  if (!words) return null;

  const sentenceStart = !before.trim() || /[.!?:]\s*$/.test(before) || /\n[ \t]*$/.test(before);
  if (sentenceStart) words = words[0].toUpperCase() + words.slice(1);
  // Speech recognition starts each phrase with a capital. Mid-sentence it is
  // lowered, unless the word is all capitals, like CSF.
  else if (/^\p{Lu}\p{Ll}/u.test(words)) words = words[0].toLowerCase() + words.slice(1);
  // "...infarct." spoken before a comma or full stop would leave two marks.
  if (/^\s*[.,;:]/.test(after)) words = words.replace(/[.,;:]+$/, "");

  const lead = before && !/\s$/.test(before) && !/^[,.;!?]/.test(words) ? " " : "";
  const trail = after && !/^[\s.,;:!?)]/.test(after) ? " " : "";
  return { lead, words, trail };
}

/**
 * Puts spoken words into the text at the cursor. Returns the new text and
 * where the cursor goes next, which is straight after the words.
 */
function insertWords(value: string, start: number, end: number, spoken: string) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const shaped = shapeWords(before, after, spoken);
  if (!shaped) return { value, caret: start };
  return {
    value: before + shaped.lead + shaped.words + shaped.trail + after,
    caret: before.length + shaped.lead.length + shaped.words.length,
  };
}

/** The Speak button that sits at the cursor, and the bubble under it. Shared by both report screens. */
export function SpeakPill({
  speaking,
  starting,
  quiet,
  onQuiet,
  readLevel,
  onPress,
  disabled,
  message,
  error,
}: {
  speaking: boolean;
  starting: boolean;
  quiet: boolean;
  onQuiet: (quiet: boolean) => void;
  readLevel: () => number;
  onPress: () => void;
  disabled: boolean;
  /** Heard words, or the command just carried out. */
  message: string;
  error: string;
}) {
  return (
    <>
      <button
        type="button"
        data-line-voice=""
        // Keeps the cursor where it is, so the words land there.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onPress}
        disabled={disabled && !speaking}
        aria-label={speaking ? "Stop speaking here" : "Speak to add words at the cursor"}
        title={speaking ? "Stop (Esc)" : "Speak to add words here"}
        className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-[family-name:var(--font-brand)] text-[0.85rem] font-bold shadow-[0_6px_18px_-6px_rgb(6_17_15/0.45)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
          speaking ? "bg-flag text-white" : "bg-ink text-surface"
        }`}
      >
        {starting && speaking ? (
          <>
            <Spinner className="h-4 w-4" />
            Wait
          </>
        ) : speaking ? (
          <>
            <VoiceMeter readLevel={readLevel} onQuiet={onQuiet} className="!h-4 !gap-[2px]" />
            {quiet ? "Speak now" : "Listening"}
            <Stop weight="fill" className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            <Microphone weight="fill" className="h-4 w-4" />
            Speak
          </>
        )}
      </button>
      {(message || error) && (
        <p
          role={error ? "alert" : undefined}
          className={`mt-1.5 w-max max-w-[22rem] rounded-xl px-3 py-1.5 font-[family-name:var(--font-brand)] text-[0.85rem] font-semibold leading-snug shadow-[0_6px_18px_-8px_rgb(6_17_15/0.4)] ${
            error ? "bg-flag text-white" : "t-speech !text-[0.9rem]"
          }`}
        >
          {error || message}
        </p>
      )}
    </>
  );
}

/**
 * Speaking straight into one line of the report. The doctor clicks where the
 * words should go, presses Speak beside the cursor, and what they say is
 * written there word for word: no AI rewrite, only short forms expanded.
 * Selected text is replaced by the spoken words.
 */
export function useLineVoice({ macros, onStart }: { macros: Macro[]; onStart?: () => void }) {
  // The line that has the cursor, and the one being spoken into.
  const [focused, setFocused] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [quiet, setQuiet] = useState(false);

  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  // Read each render, so writing always starts from the latest report.
  const writers = useRef(new Map<string, (text: string) => void>());
  const targetRef = useRef<string | null>(null);
  // Where the next words go. Kept here too, because the box may lose focus.
  const range = useRef({ start: 0, end: 0 });
  const macrosRef = useRef(macros);
  useEffect(() => {
    macrosRef.current = macros;
  }, [macros]);
  // Lines that can start a new line under themselves ("next line").
  const lineMakers = useRef(new Map<string, () => string>());
  // Spoken changes, newest last, for "undo that".
  const history = useRef<{ key: string; before: string; after: string }[]>([]);
  const [note, setNote] = useState("");
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function place(key: string) {
    // While one line is listening, its button stays where it is.
    if (live && targetRef.current && targetRef.current !== key) return;
    const field = fields.current.get(key);
    const line = field?.offsetParent as HTMLElement | null;
    if (!field || !line) return;
    const index = field.selectionEnd;
    const point = caretPoint(field, index);
    const left = field.offsetLeft + point.left;
    const top = field.offsetTop + point.top;
    const atLineEnd = index === field.value.length || field.value[index] === "\n";
    // Beside the cursor when it is at the end of the text, so no words are
    // covered; otherwise just above it.
    setSpot(
      atLineEnd && left + 10 + BUTTON_WIDTH <= line.clientWidth
        ? { left: left + 10, top: top + point.height / 2 - BUTTON_HEIGHT / 2 }
        : {
            left: Math.min(Math.max(0, left - BUTTON_WIDTH / 2), line.clientWidth - BUTTON_WIDTH),
            top: top - BUTTON_HEIGHT - 6,
          },
    );
  }

  /** Says briefly which spoken command was carried out, under the button. */
  function tell(message: string) {
    clearTimeout(noteTimer.current);
    setNote(message);
    noteTimer.current = setTimeout(() => setNote(""), 2500);
  }

  /** Writes new text into a line and keeps the cursor where the next words go. */
  function change(key: string, value: string, caret: number) {
    const field = fields.current.get(key);
    const writeLine = writers.current.get(key);
    if (!field || !writeLine || value === field.value) return;
    history.current.push({ key, before: field.value, after: value });
    range.current = { start: caret, end: caret };
    writeLine(value);
    // Once the new text is on screen, put the cursor after it.
    requestAnimationFrame(() => {
      if (document.activeElement === field) field.setSelectionRange(caret, caret);
      place(key);
    });
  }

  async function apply(pieces: SpokenPiece[]) {
    for (const piece of pieces) {
      const key = targetRef.current;
      const field = key ? fields.current.get(key) : undefined;
      if (!key || !field) return;
      // If the doctor moved the cursor while speaking, follow it.
      const { start, end } =
        document.activeElement === field
          ? { start: field.selectionStart, end: field.selectionEnd }
          : range.current;

      if (piece.kind === "text") {
        const next = insertWords(field.value, start, end, expandMacros(piece.text, macrosRef.current));
        if (hasCorrection(piece.text)) {
          // "18 cm… sorry, 15 cm": the correction replaces what it corrects in this line.
          const corrected = resolveCorrections(next.value.slice(0, next.caret));
          const rest = next.value.slice(next.caret);
          change(key, corrected.text + (rest && !/^\s/.test(rest) ? " " : "") + rest, corrected.text.length);
          tell(
            corrected.changes.length
              ? `Corrected: ${corrected.changes.join(", ")}`
              : "Correction heard. Check this line.",
          );
        } else {
          change(key, next.value, next.caret);
        }
      } else if (piece.command === "newLine" || piece.command === "newParagraph") {
        const addLine = lineMakers.current.get(key);
        if (addLine) {
          // A report line holds one statement: the next one goes on a line of its own.
          const created = addLine();
          await frame();
          await frame();
          const newField = fields.current.get(created);
          if (newField) {
            targetRef.current = created;
            setTarget(created);
            range.current = { start: 0, end: 0 };
            newField.focus();
            requestAnimationFrame(() => place(created));
          }
        } else {
          // The impression is one box; a new line there is a line break.
          const breakText = piece.command === "newParagraph" ? "\n\n" : "\n";
          const value = field.value.slice(0, start).replace(/[ \t]+$/, "") + breakText + field.value.slice(end);
          change(key, value, start + breakText.length);
        }
        tell(COMMAND_LABELS[piece.command]);
      } else if (piece.command === "deleteMacro") {
        const result = removeLastMacro(field.value, macrosRef.current);
        if (result.macro) {
          change(key, result.text, result.text.length);
          tell(`Removed “${result.macro.shortForm}”`);
        } else {
          tell("No macro in this line to remove");
        }
      } else {
        const last = history.current.pop();
        const lastField = last ? fields.current.get(last.key) : undefined;
        if (last && lastField?.value === last.after) {
          writers.current.get(last.key)?.(last.before);
          tell("Undone");
        } else {
          tell("Nothing to undo");
        }
      }
      // Lets the report re-render before the next piece reads it.
      await frame();
    }
  }

  // Words arrive in pieces; each is finished before the next starts.
  const queue = useRef(Promise.resolve());
  const listener = useRef(spokenStream());
  function write(words: Word[]) {
    const pieces = listener.current.push(words.map((word) => word.text).join(" "));
    queue.current = queue.current.then(() => apply(pieces));
  }

  const dictation = useDictation({
    model: "nova-3-medical",
    language: "en-IN",
    keyterms: macros.map((macro) => macro.shortForm).slice(0, 50),
    onWords: write,
  });
  const live = dictation.recording || dictation.starting;
  // Listening can end without Stop (the microphone was refused or the
  // connection dropped), so a line counts as spoken into only while live.
  const activeTarget = live ? target : null;

  function start(key: string) {
    const field = fields.current.get(key);
    if (!field) return;
    onStart?.();
    range.current = { start: field.selectionStart, end: field.selectionEnd };
    // "Undo that" reaches back only as far as this time speaking.
    history.current = [];
    listener.current = spokenStream();
    targetRef.current = key;
    setTarget(key);
    setQuiet(false);
    dictation.start();
  }

  async function stop() {
    await dictation.stop();
    // Words held back in case a phrase carried on are written now.
    const pieces = listener.current.flush();
    await (queue.current = queue.current.then(() => apply(pieces)));
    targetRef.current = null;
    setTarget(null);
  }

  /**
   * Props for a line's text box. `writeLine` saves the line's new text;
   * `addLine`, when given, starts a new line under it and returns that line's key.
   */
  function bind(key: string, writeLine: (text: string) => void, addLine?: () => string) {
    writers.current.set(key, writeLine);
    if (addLine) lineMakers.current.set(key, addLine);
    else lineMakers.current.delete(key);
    return {
      ref: (field: HTMLTextAreaElement | null) => {
        if (field) fields.current.set(key, field);
        else fields.current.delete(key);
      },
      onFocus: () => {
        setFocused(key);
        // The browser sets the cursor just after focus.
        requestAnimationFrame(() => place(key));
      },
      onBlur: () => setFocused((current) => (current === key ? null : current)),
      onSelect: () => place(key),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Escape" && targetRef.current === key && live) {
          event.preventDefault();
          stop();
        }
      },
    };
  }

  /** The Speak button for one line, placed at its cursor. Lives inside the line's `relative` box. */
  function button(key: string, disabled = false): ReactNode {
    const speaking = activeTarget === key;
    if (!spot || (!speaking && (focused !== key || activeTarget !== null))) return null;
    const words = speaking ? note || dictation.interim : "";
    const error = focused === key && !live ? dictation.error : "";
    return (
      <div className="absolute z-10" style={{ left: spot.left, top: spot.top }}>
        <SpeakPill
          speaking={speaking}
          starting={dictation.starting}
          quiet={quiet}
          onQuiet={setQuiet}
          readLevel={dictation.readLevel}
          onPress={() => (speaking ? stop() : start(key))}
          disabled={disabled}
          message={words}
          error={error}
        />
      </div>
    );
  }

  return { bind, button, live, stop };
}
